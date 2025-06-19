'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { contractSchema, ContractFormData } from '@/lib/validation/contract-schema';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import axios from 'axios';
import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { Loader2, ChevronDown } from 'lucide-react';
import ContractEditor from '@/components/ContractEditor';
import FileUploader from '@/components/FileUploader';

const benefitOptions = [
    { id: 'health', label: 'Health' },
    { id: 'dental', label: 'Dental' },
    { id: 'vacationSick', label: 'Vacation/sick' },
    { id: 'parking', label: 'Parking' },
    { id: 'profitSharing', label: 'Profit Sharing' },
    { id: 'fourZeroOneK', label: '401K' },
    { id: 'paidBarMembership', label: 'Paid Bar membership' },
    { id: 'clePaid', label: 'CLE paid' },
    { id: 'cellPhone', label: 'Cell phone' },
] as const;


export default function Home() {
  const [generatedContract, setGeneratedContract] = useState<string>('');
  const [isGeneratingContract, setIsGeneratingContract] = useState<boolean>(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [isUploaderVisible, setIsUploaderVisible] = useState(false);

  const form = useForm({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      employerName: "",
      employeeName: "",
      jobTitle: "",
      jobDescription: "",
      startDate: "",
      hasInitialTerm: false,
      hasNoEndDate: false,
      onSitePresence: "",
      salary: "",
      benefits: {
        health: false,
        dental: false,
        vacationSick: false,
        parking: false,
        profitSharing: false,
        fourZeroOneK: false,
        paidBarMembership: false,
        clePaid: false,
        cellPhone: false,
      },
      otherBenefits: "",
      includeNda: false,
      includeNonCompetition: false,
      attyInNotice: false,
      attorneyName: '',
      prose: "",
    },
  });

  const attyInNotice = form.watch('attyInNotice');

  // This effect establishes the socket connection.
  useEffect(() => {
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);
    console.log('Socket instance created.');

    // Cleanup function to disconnect the socket when the component unmounts.
    // This is crucial for React's StrictMode to prevent duplicate connections.
    return () => {
      console.log('Cleaning up and disconnecting socket.');
      newSocket.disconnect();
    };
  }, []); // Empty dependency array ensures this runs only on mount and unmount.

  useEffect(() => {
    // This effect is responsible for handling socket event listeners.
    // It runs whenever the `socket` state changes.
    if (!socket) return;

    const onConnect = () => {
      console.log('Socket connected!');
      // clear any previous chat history on new connection
      setChatHistory([]);
    };

    const onDisconnect = () => {
      console.log('Socket disconnected!');
    };

    const onContractUpdate = (data: {
      contract: string;
      requestId: string;
    }) => {
      console.log(
        `[FRONTEND] Received contract_update with ID: ${data.requestId}`,
        data,
      );
      setGeneratedContract(data.contract);
      // Add only the assistant's final response to the history
      setChatHistory(prev => [...prev, { role: 'assistant', content: data.contract }]);
      setIsEditing(false);
    };

    const onGenerationComplete = (data: { contract: string }) => {
      setGeneratedContract(data.contract);
      setIsGeneratingContract(false);
      // Initialize chat history after generation
      setChatHistory([
        { role: 'assistant', content: data.contract }
      ]);
    };

    const onEditError = (data: { error: string; requestId?: string }) => {
      console.error(`[FRONTEND] Received edit_error for ID ${data.requestId}:`, data.error);
      setChatHistory(prev => [...prev, { role: 'assistant', content: `Error: ${data.error}` }]);
      setIsEditing(false);
    };

    const onLog = (data: { message: string; type?: string }) => {
      console.log(`[SERVER LOG] ${data.type || 'info'}: ${data.message}`);
    };

    // Register event listeners
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('generation_complete', onGenerationComplete);
    socket.on('contract_update', onContractUpdate);
    socket.on('edit_error', onEditError);
    socket.on('log', onLog);
    console.log('Attaching socket listeners.');

    // Cleanup function to remove event listeners when the component
    // re-renders or unmounts. Prevents duplicate event registrations.
    return () => {
      console.log('Detaching socket listeners.');
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('generation_complete', onGenerationComplete);
      socket.off('contract_update', onContractUpdate);
      socket.off('edit_error', onEditError);
      socket.off('log', onLog);
    };
  }, [socket]); // This effect re-runs only when the socket instance changes.

  async function onSubmit(data: ContractFormData) {
    setIsGeneratingContract(true);
    setGeneratedContract(''); // Clear previous contract
    setChatHistory([]); // Clear previous history

    // The initial prompt is not shown in the chat, but it's the first turn for the history.
    const initialPrompt = `Generate a contract with these details: ${JSON.stringify(data)}`;
    setChatHistory([{ role: 'user', content: initialPrompt }]);

    const formData = new FormData();
    formData.append('contractData', JSON.stringify(data));
    if (templateFile) {
      formData.append('templateFile', templateFile);
    }

    try {
      const response = await axios.post(
        'http://localhost:3001/api/v1/contracts/generate',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      setGeneratedContract(response.data.contract);
      // Manually set the history after generation
      setChatHistory([
        { role: 'user', content: initialPrompt },
        { role: 'assistant', content: response.data.contract },
      ]);
    } catch (error) {
      console.error('Error generating contract:', error);
      // TODO: show a toast or other error message to the user
    } finally {
      setIsGeneratingContract(false);
    }
  }

  const handleSendMessage = () => {
    if (!chatInput.trim() || !socket) return;
    
    const requestId = `req-${Date.now()}`;
    console.log(`[FRONTEND] Sending editContract with ID: ${requestId}`);

    setIsEditing(true);
    const payload = {
      history: [...chatHistory, { role: 'user', content: chatInput }],
      requestId: requestId,
    };
    socket.emit('editContract', payload);
    setChatHistory(prev => [...prev, { role: 'user', content: chatInput }]);
    setChatInput('');
  };
  
  const handleExportPDF = () => {
    const input = document.getElementById('contract-content');
    if (input) {
      // Use scrollHeight to ensure the whole content is captured vertically
      // Let html2canvas determine the width automatically from the element's CSS
      html2canvas(input, {
        scale: 2, // Higher scale for better quality render
        useCORS: true,
        backgroundColor: '#ffffff',
        height: input.scrollHeight,
        windowHeight: input.scrollHeight,
      }).then(canvas => {
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;

        const pdf = new jsPDF({
          orientation: 'p',
          unit: 'pt', // Use points as unit, standard for PDF
          format: 'a4',
        });

        const pdfPageWidth = pdf.internal.pageSize.getWidth();
        const pdfPageHeight = pdf.internal.pageSize.getHeight();
        
        const margin = 40; // 40pt margin on each side
        const contentWidth = pdfPageWidth - (margin * 2);
        const contentHeight = pdfPageHeight - (margin * 2);

        let sourceImageY = 0; // The y-coordinate of the top of the slice from the source canvas
        let heightLeftOnCanvas = canvasHeight;

        while (heightLeftOnCanvas > 0) {
          if (sourceImageY > 0) {
            pdf.addPage();
          }

          const heightToDrawOnPdf = Math.min(contentHeight, (heightLeftOnCanvas * contentWidth) / canvasWidth);
          const heightToSliceFromCanvas = (heightToDrawOnPdf / contentWidth) * canvasWidth;

          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = canvasWidth;
          sliceCanvas.height = heightToSliceFromCanvas;
          const ctx = sliceCanvas.getContext('2d');
          
          if(ctx) {
            ctx.drawImage(canvas, 0, sourceImageY, canvasWidth, heightToSliceFromCanvas, 0, 0, canvasWidth, heightToSliceFromCanvas);
            pdf.addImage(sliceCanvas, 'PNG', margin, margin, contentWidth, heightToDrawOnPdf);
          }

          heightLeftOnCanvas -= heightToSliceFromCanvas;
          sourceImageY += heightToSliceFromCanvas;
        }

        pdf.save('contract-draft.pdf');
      }).catch(err => {
        console.error("html2canvas-pro failed:", err);
      });
    }
  };

  const handleGenerateDescription = async () => {
    // Manually trigger validation for the fields needed for generation
    const isValid = await form.trigger(['jobTitle', 'employerName']);

    // If validation fails, the error messages will be displayed automatically
    // by the FormMessage components, and we can abort the function.
    if (!isValid) {
      return;
    }

    setIsGeneratingDescription(true);
    try {
      const { jobTitle, employerName } = form.getValues();
      
      const response = await axios.post('/api/v1/contracts/generate-description', {
        jobTitle,
        companyName: employerName,
      });

      if (response.data && response.data.description) {
        form.setValue('jobDescription', response.data.description);
      }

    } catch (error) {
      console.error('Failed to generate description:', error);
      // Here we could show a toast notification for server errors
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const renderForm = () => (
    <div className="w-full max-w-4xl mx-auto">
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Creation Assistant: Employment Agreement</CardTitle>
          <CardDescription>
            Fill out the fields below to generate a first draft.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              <div className="space-y-4">
                <div 
                  className="flex justify-between items-center cursor-pointer border-b pb-2"
                  onClick={() => setIsUploaderVisible(!isUploaderVisible)}
                  role="button"
                  aria-expanded={isUploaderVisible}
                >
                  <h3 className="text-lg font-semibold">Upload your own template (Optional)</h3>
                  <ChevronDown 
                    className={`h-5 w-5 transition-transform duration-200 ${isUploaderVisible ? 'rotate-180' : ''}`} 
                  />
                </div>
                {isUploaderVisible && (
                  <FileUploader onFileSelect={setTemplateFile} />
                )}
              </div>

              {/* Section: Parties */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Parties</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="employerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employer Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Acme Inc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="employeeName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employee Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Section: Job Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Job Details</h3>
                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="jobTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Senior Software Engineer" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="jobDescription"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Job Description</FormLabel>
                          <Button type="button" variant="outline" size="sm" className="text-xs" onClick={handleGenerateDescription} disabled={isGeneratingDescription}>
                            {isGeneratingDescription ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating...
                              </>
                            ) : 'Generate with AI'}
                          </Button>
                        </div>
                        <FormControl>
                          <Textarea
                            placeholder="Describe the main responsibilities, duties, and required qualifications for the role."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Section: Employment Term */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Employment Term</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="space-y-2">
                    <FormLabel>Term</FormLabel>
                    <div className="flex items-center space-x-4 pt-2">
                        <FormField
                          control={form.control}
                          name="hasNoEndDate"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={(checked) => {
                                    field.onChange(checked);
                                    if (checked) {
                                      form.setValue('hasInitialTerm', false);
                                    }
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                No end date
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                         <FormField
                          control={form.control}
                          name="hasInitialTerm"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={(checked) => {
                                    field.onChange(checked);
                                    if (checked) {
                                      form.setValue('hasNoEndDate', false);
                                    }
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Initial term
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section: Work Location and Schedule */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Work Location and Schedule</h3>
                <FormField
                  control={form.control}
                  name="onSitePresence"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>On-site presence</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 3 days a week, or 100%" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Section: Compensation */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Compensation</h3>
                <FormField
                  control={form.control}
                  name="salary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Salary</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: $150,000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Section: Benefits */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Benefits</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {benefitOptions.map((option) => (
                      <FormField
                        key={option.id}
                        control={form.control}
                        name={`benefits.${option.id}`}
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>{option.label}</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                    ))}
                </div>
                <FormField
                  control={form.control}
                  name="otherBenefits"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Other benefits?</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Describe any other benefits..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Section: Additional Clauses */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Additional Clauses</h3>
                 <FormField
                  control={form.control}
                  name="includeNda"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Include NDA?</FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="includeNonCompetition"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Include non-competition?</FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="attyInNotice"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                       <div className="space-y-0.5">
                        <FormLabel className="text-base">Atty to be named in the Notice provision?</FormLabel>
                      </div>
                      <FormControl>
                         <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                {attyInNotice && (
                  <FormField
                    control={form.control}
                    name="attorneyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Attorney&apos;s Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., John Doe, Esq." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
        </div>

              {/* Section: Other Specifics */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Other Specifics</h3>
                <FormField
                  control={form.control}
                  name="prose"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Other things to include (in prose):</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Ex: 'Add a clause specifying the employee must use their own computer equipment.'"
                          className="min-h-[100px]" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center items-center mt-6">
                <Button type="submit" size="lg" disabled={isGeneratingContract}>
                  {isGeneratingContract && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generate Draft
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );

  const renderEditor = () => (
    <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="md:col-span-2">
        <Card className="h-full relative max-h-[calc(100vh-6rem)] flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Contract Draft</CardTitle>
            <Button onClick={handleExportPDF} variant="outline">
              Export as PDF
            </Button>
          </CardHeader>
          <CardContent id="contract-content" className="flex-1 overflow-y-auto p-6">
            <ContractEditor
              content={generatedContract}
              onChange={setGeneratedContract}
              isEditing={isEditing}
            />
          </CardContent>
          {isEditing && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
              <div className="text-center p-4 bg-white rounded-lg shadow-xl">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                <p className="mt-2 text-lg font-semibold">Editing in progress...</p>
                <p className="text-sm text-muted-foreground">The AI is applying your changes.</p>
              </div>
            </div>
          )}
        </Card>
      </div>
      <div className="sticky top-8 md:col-span-1">
        <Card className="flex flex-col max-h-[calc(100vh-6rem)]">
          <CardHeader>
            <CardTitle>Ask for changes</CardTitle>
            <CardDescription>
              Request changes in plain English.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            <div className="h-full border rounded-md p-4 bg-gray-50 space-y-4">
              {chatHistory.map((msg, index) => {
                // The very first user message is the prompt for generation, so we don't display it.
                if (index === 0 && msg.role === 'user') {
                  return null;
                }
                // The first assistant message is the full contract, so we show a canned response.
                if (index === 1 && msg.role === 'assistant') {
                   return (
                    <div key={index} className="flex justify-start">
                       <div className="max-w-md p-3 rounded-lg bg-gray-200 text-gray-900">
                          I have generated a draft of the contract. Feel free to review it and ask me for changes. For example: &apos;Change the salary to $98,000&apos; or &apos;Add a clause for a company car.&apos;
                       </div>
                    </div>
                  );
                }
                // Subsequent user messages are displayed as is.
                if (msg.role === 'user') {
                  return (
                    <div key={index} className="flex justify-end">
                      <div className="max-w-md p-3 rounded-lg bg-blue-500 text-white">
                        {msg.content}
                      </div>
                    </div>
                  );
                }
                // Subsequent assistant messages are confirmation of updates.
                 if (index > 1 && msg.role === 'assistant') {
                  return (
                    <div key={index} className="flex justify-start">
                       <div className="max-w-md p-3 rounded-lg bg-gray-200 text-gray-900">
                          The contract has been updated based on your request.
                       </div>
                    </div>
                  );
                }
                return null;
              })}
              {isEditing && (
                <div className="flex justify-start">
                  <div className="p-3">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center space-x-2 w-full">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ex: Change salary to $160,000."
                className="flex-1"
                disabled={isEditing}
              />
              <Button type="submit" className="w-auto" disabled={isEditing}>
                {isEditing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Editing...
                  </>
                ) : 'Send'}
              </Button>
            </form>
          </CardFooter>
        </Card>
      </div>
    </div>
  );

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 sm:p-8">
      <div className="w-full max-w-7xl mx-auto">
        {generatedContract ? renderEditor() : renderForm()}
      </div>
    </main>
  );
}
