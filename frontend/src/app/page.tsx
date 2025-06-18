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
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const form = useForm<ContractFormData>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      employerName: "",
      employeeName: "",
      jobTitle: "",
      jobDescription: "",
      startDate: "",
      hasInitialTerm: false,
      hasNoEndDate: true,
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
      prose: "",
    },
  });

  async function onSubmit(data: ContractFormData) {
    setIsLoading(true);
    setGeneratedContract('');
    try {
      const response = await axios.post('http://localhost:3001/api/v1/contracts/generate', data);
      if (response.data && response.data.contract) {
        setGeneratedContract(response.data.contract);
      } else {
        // Handle cases where the contract is not in the response
        setGeneratedContract("Error: Could not generate contract.");
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setGeneratedContract("Error: Failed to communicate with the server.");
    } finally {
      setIsLoading(false);
    }
  }
  
  const renderForm = () => (
    <div className="w-full max-w-4xl mx-auto">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Creation Assistant: Employment Agreement</CardTitle>
          <CardDescription>
            Fill out the fields below to generate a first draft.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Section: Parties */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Parties</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="employerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name of employer</FormLabel>
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
                        <FormLabel>Name of employee</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Section: Position */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Position</h3>
                <FormField
                  control={form.control}
                  name="jobTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job title</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Senior Software Engineer" {...field} />
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
                      <FormLabel>Job Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the main responsibilities, daily tasks, and objectives of the position..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Section: Terms */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Contract Terms</h3>
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

              {/* Section: Conditions */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Conditions</h3>
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
              </div>

              {/* Section: Prose */}
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

              <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                {isLoading ? 'Generating Draft...' : 'Generate Draft'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );

  const renderEditor = () => (
    <div className="flex w-full space-x-8">
      {/* Left side: Document */}
      <div className="flex-1">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Contract Draft</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {generatedContract}
            </ReactMarkdown>
          </CardContent>
        </Card>
      </div>
      {/* Right side: Chat */}
      <div className="w-1/3">
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle>Ask for changes</CardTitle>
            <CardDescription>
              Request changes in plain English.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="h-full border rounded-md p-2 bg-gray-50">
              <p className="text-sm text-gray-500">
                Chat history will appear here.
              </p>
            </div>
          </CardContent>
          <CardFooter>
              <div className="w-full flex space-x-2">
                  <Textarea placeholder="Ex: Increase salary to $160,000." />
                  <Button>Send</Button>
              </div>
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
