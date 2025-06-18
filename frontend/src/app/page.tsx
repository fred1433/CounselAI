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
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { io, Socket } from 'socket.io-client';

// For development: initialize with mock data to bypass the form.
const MOCK_CONTRACT_DATA = `# EMPLOYMENT AGREEMENT

This Employment Agreement (the "Agreement") is made effective as of the last date of signature below (the "Effective Date"), by and between:

**INNOVATECH SOLUTIONS**, a [State of Incorporation, e.g., Delaware] corporation, with its principal place of business at [Company Address, e.g., 123 Tech Drive, Silicon Valley, CA 90210, USA] (the "Company");

AND

**ALICE DUBOIS**, an individual residing at [Employee Address, e.g., 45 Rue de la Paix, 75002 Paris, France] (the "Employee").

The Company and Employee are hereinafter collectively referred to as the "Parties" and individually as a "Party."

**WHEREAS**, the Company desires to employ Employee, and Employee desires to be employed by the Company, upon the terms and conditions hereinafter set forth;

**NOW, THEREFORE**, in consideration of the mutual covenants and promises contained herein and other good and valuable consideration, the receipt and sufficiency of which are hereby acknowledged, the Parties agree as follows:

---

## 1. POSITION AND DUTIES

1.1. **Job Title:** The Company hereby employs Employee in the position of **Lead Data Scientist**.

1.2. **Job Description:** As Lead Data Scientist, Employee shall be responsible for leading the data science team to develop machine learning models for personalized user experiences. Employee's responsibilities will include, but not be limited to, project planning, mentoring junior scientists, and communicating findings to stakeholders. Employee shall perform such other duties as may be assigned by the Company from time to time, consistent with the Employee's position and the needs of the Company's business.

1.3. **Reporting Relationship:** Employee shall report directly to [Insert Supervisor's Title, e.g., the Head of AI & Machine Learning] or such other person as the Company may designate.

---

## 2. EMPLOYMENT TERM

2.1. **Start Date:** Employee's employment with the Company shall commence on **August 1, 2025** (the "Start Date").

2.2. **At-Will Employment:** Employee's employment with the Company is and shall remain "at-will." This means that either the Employee or the Company may terminate the employment relationship at any time, with or without cause or advance notice, for any reason not prohibited by law. Nothing in this Agreement, nor in any Company policy or practice, shall be construed to create a contract of employment for a definite term. The at-will nature of this employment may only be modified by an express written agreement signed by the Employee and a duly authorized officer of the Company.

---

## 3. WORK LOCATION AND SCHEDULE

3.1. **Primary Work Location:** Employee's primary work location will be a hybrid arrangement. Employee is required to be present at the Company's Paris office for **three (3) days per week**. The specific days will be determined by mutual agreement with Employee's supervisor, subject to the Company's operational needs. For the remaining workdays, Employee may work remotely.

3.2. **Business Travel:** Employee may be required to travel periodically for business purposes, including to the Company's principal offices or other locations as reasonably required by the Company.

---

## 4. COMPENSATION

4.1. **Base Salary:** As compensation for the services rendered under this Agreement, the Company shall pay Employee a gross annual base salary of **Ninety-Five Thousand Euros (€95,000)**, payable in accordance with the Company's standard payroll practices, less all applicable taxes and withholdings.

4.2. **Review:** Employee's compensation will be subject to annual review and may be adjusted at the Company's sole discretion.

---

## 5. BENEFITS

5.1. **Standard Benefits:** Employee shall be eligible to participate in the following Company-sponsored benefits programs, subject to the terms and conditions of each plan and applicable eligibility requirements, as they may be amended from time to time:
 a.  **Health Insurance:** Medical coverage.
    b.  **Dental Insurance:** Dental coverage.
    c.  **Vacation and Sick Leave:** Accrued paid time off for vacation and sick leave, in accordance with the Company's then-current policies.
    d.  **Profit Sharing Plan:** Participation in the Company's profit sharing plan, if and when available, subject to plan terms.
    e. **Cell Phone:** Reimbursement for reasonable business use of a personal cell phone or provision of a Company-owned cell phone, in accordance with Company policy.

5.2. **Professional Development Budget:** The Company shall provide Employee with an annual budget of **One Thousand Five Hundred Euros (€1,500)** for professional development and conferences, subject to Company approval and expense reimbursement policies. Unused portions of this budget do not roll over to subsequent years.

5.3. **Stock Options:** Employee will be granted stock options in the Company, which shall vest over a four (4)-year period, subject to Employee's continuous employment with the Company. The specific terms and conditions of the stock option grant, including the number of options, exercise price, vesting schedule, and other provisions, will be set forth in a separate Stock Option Agreement and governed by the Company's applicable stock option plan document, which Employee will be required to acknowledge and sign.

5.4. **Modification of Benefits:** The Company reserves the right to modify, amend, suspend, or terminate any of its benefit plans or programs at any time, with or without notice, in its sole discretion.

---

## 6. CONFIDENTIALITY, NON-DISCLOSURE, AND PROPRIETARY INFORMATION

6.1. **Acknowledgment:** Employee acknowledges that in the course of performing services for the Company, Employee will have access to and develop Confidential Information (as defined below) that is valuable, special, and unique to the business of the Company. Employee agrees that the Company will suffer irreparable harm if Employee breaches the obligations set forth in this Section 6, and monetary damages will be inadequate to compensate the Company for such a breach.

6.2. **Confidential Information:** "Confidential Information" means any and all non-public information, in any form or medium, belonging to, used by, or concerning the Company's business, including but not limited to, trade secrets, financial data, business plans, product specifications, development plans, marketing strategies, customer lists, pricing strategies, technical data, research, formulas, algorithms, software, designs, ideas, inventions, processes, computer programs, data compilations, know-how, and any information concerning the Company's employees.

6.3. **Obligations:** Employee agrees that during the term of employment and at all times thereafter, Employee shall:
    a.  Hold all Confidential Information in strict confidence and trust.
    b.  Not use Confidential Information for any purpose other than for the benefit of the Company.
  c.  Not disclose, publish, or disseminate Confidential Information to any third party without the prior written consent of the Company.
    d.  Take all reasonable precautions to prevent the unauthorized use, disclosure, or dissemination of Confidential Information.

6.4. **Exclusions:** Confidential Information does not include information that: (a) is or becomes publicly known through no fault of Employee; (b) is lawfully received by Employee from a third party without restriction and without breach of this Agreement; (c) is independently developed by Employee without use of or reference to Confidential Information; or (d) is required to be disclosed by law or court order, provided Employee gives the Company prompt notice of such requirement prior to disclosure.

---

## 7. INTELLECTUAL PROPERTY ASSIGNMENT

7.1. **Company Property:** Employee agrees that all works of authorship, inventions, discoveries, improvements, processes, designs, software, computer programs, ideas, data, and information (collectively, "Inventions") that Employee creates, conceives, discovers, or develops, either alone or with others, (a) during the period of employment, (b) within the scope of employment, (c) using Company resources, or (d) that relate to the Company's actual or anticipated business, research, or development, are "Company Inventions."

7.2. **Assignment:** Employee hereby irrevocably assigns to the Company all right, title, and interest in and to all Company Inventions, including all intellectual property rights therein (including, without limitation, all patents, copyrights, trademarks, trade secrets, and other proprietary rights). Employee agrees that all Company Inventions that are copyrightable works shall be considered "works made for hire" as that term is defined in the United States Copyright Act.

7.3. **Further Assurances:** Employee agrees to execute any and all documents and to do all acts necessary or desirable, at the Company's expense, to perfect the Company's ownership of and to assist the Company in obtaining and enforcing patent, copyright, trademark, and other intellectual property rights in Company Inventions.

---

## 8. NON-COMPETITION AND NON-SOLICITATION

8.1. **Non-Competition:** During Employee's employment with the Company and for a period of **twelve (12) months** following the termination of Employee's employment for any reason (the "Restricted Period"), Employee shall not, directly or indirectly, engage in, be employed by, consult for, own, manage, operate, control, or participate in the ownership, management, operation, or control of any business that competes with the Company's business (including, but not limited to, the development of machine learning models for personalized user experiences) within any geographic area where the Company conducts business or has concrete plans to conduct business (the "Restricted Territory"). This restriction is limited to activities similar to those performed by Employee for the Company or activities that would involve the use of Confidential Information gained during Employee's employment.

8.2. **Non-Solicitation of Customers:** During the Restricted Period, Employee shall not, directly or indirectly, solicit or attempt to solicit, for the purpose of providing products or services competitive with those provided by the Company, any person or entity who was a customer, client, or active prospective customer of the Company with whom Employee had material contact during the last twelve (12) months of employment.

8.3. **Non-Solicitation of Employees:** During the Restricted Period, Employee shall not, directly or indirectly, solicit or induce any employee of the Company to leave their employment with the Company or hire any employee who has terminated their employment with the Company within six (6) months of such termination.

8.4. **Reasonableness:** Employee acknowledges that the duration, geographic scope, and scope of activity of these restrictions are reasonable and necessary to protect the Company's legitimate business interests, including its Confidential Information, goodwill, and customer relationships. If any part of this Section 8 is found to be unreasonable, unlawful, or unenforceable, it shall be modified or severed to the extent necessary to make it enforceable, and the remainder of the Section shall remain in full force and effect.

---

## 9. TERMINATION OF EMPLOYMENT

9.1. **At-Will Termination:** As set forth in Section 2.2, Employee's employment is at-will and may be terminated by either Party at any time, with or without cause or advance notice.

9.2. **Effect of Termination:** Upon termination of employment for any reason, Employee shall immediately return to the Company all Company property, including without limitation, equipment, documents, files, and all copies thereof, whether in hard copy or electronic form, that are in Employee's possession or control. Employee shall also fully cooperate with the Company in all matters relating to the winding up of Employee's services.

9.3. **Accrued Obligations:** Upon termination, the Company shall pay Employee all earned but unpaid base salary up to the date of termination, as well as any accrued but unused vacation time in accordance with Company policy and applicable law. No severance pay or other termination benefits shall be payable unless otherwise agreed in writing by an authorized officer of the Company or as required by law.

---

## 10. REPRESENTATIONS AND WARRANTIES OF EMPLOYEE

10.1. **Authority:** Employee represents and warrants that Employee has the full right, power, and authority to enter into this Agreement and to perform all obligations hereunder.

10.2. **No Conflicts:** Employee represents and warrants that the execution and delivery of this Agreement and the performance of Employee's duties hereunder will not violate or constitute a breach of any agreement, contract, or understanding to which Employee is a party or by which Employee is bound, including without limitation, any non-disclosure, non-competition, or intellectual property assignment agreement.

---

## 11. GENERAL PROVISIONS

11.1. **Governing Law:** This Agreement shall be governed by and construed in accordance with the laws of the **State of Delaware**, without regard to its conflict of laws principles. The Parties agree that any dispute arising out of or relating to this Agreement shall be brought exclusively in the state or federal courts located in the State of Delaware.

11.2. **Entire Agreement:** This Agreement, together with any separate Stock Option Agreement and other Company benefit plan documents, constitutes the entire agreement between the Parties concerning the subject matter hereof and supersedes all prior agreements, discussions, and understandings, whether written or oral, between the Parties regarding Employee's employment with the Company.

11.3. **Amendments:** This Agreement may not be amended or modified except by a written instrument signed by both the Company and Employee.

11.4. **Severability:** If any provision of this Agreement is held to be invalid or unenforceable, the remaining provisions shall continue in full force and effect. If any provision is deemed invalid or unenforceable as applied to any person or circumstance, it shall be deemed valid and enforceable as applied to all other persons and circumstances.

11.5. **Waiver:** No waiver by either Party of any breach of any provision of this Agreement shall be deemed a waiver of any subsequent or other breach of the same or any other provision.

11.6. **Notices:** All notices required or permitted under this Agreement shall be in writing and delivered personally, by reputable overnight courier, or by certified mail, return receipt requested, to the addresses set forth below or to such other address as either Party may specify by notice to the other.

    **If to Company:**
    Innovatech Solutions
    [Company Address, e.g., 123 Tech Drive]
    [City, State, Zip, e.g., Silicon Valley, CA 90210, USA]
    Attention: Human Resources

    **If to Employee:**
    Alice Dubois
    [Employee Address, e.g., 45 Rue de la Paix]
    [City, Postal Code, Country, e.g., 75002 Paris, France]

11.7. **Headings:** The headings in this Agreement are for convenience only and shall not affect its interpretation.

11.8. **Counterparts:** This Agreement may be executed in counterparts, each of which shall be deemed an original, but all of which together shall constitute one and the same instrument. Facsimile or electronic signatures shall be deemed original signatures for all purposes.

11.9. **Acknowledgement:** Employee acknowledges that Employee has had the opportunity to review this Agreement and to consult with an attorney of Employee's choosing regarding its terms. Employee understands and agrees to be bound by the terms and conditions contained herein.

---

**IN WITNESS WHEREOF**, the Parties have executed this Employment Agreement as of the dates set forth below.

**INNOVATECH SOLUTIONS**

By: _______________________________
Name: [Authorized Signatory Name]
Title: [Authorized Signatory Title]
Date: _______________________________

**ALICE DUBOIS**

Signature: ___________________________
Name: Alice Dubois
Date: _______________________________
`;

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
  const [isEditing, setIsEditing] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ author: string, message: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);

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

  // Effect to manage WebSocket connection
  useEffect(() => {
    if (!generatedContract) return;

    // Make sure to use the correct backend URL
    const newSocket = io('http://localhost:3001'); 
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to WebSocket server');
      setChatHistory(prev => [...prev, { author: 'System', message: 'Connected to the server.' }]);
    });

    newSocket.on('contractUpdated', (newContract: string) => {
      setGeneratedContract(newContract);
      setIsEditing(false);
      setChatHistory(prev => [...prev, { author: 'System', message: 'Contract has been updated.' }]);
    });

    newSocket.on('editError', (errorMessage: string) => {
      setIsEditing(false);
      setChatHistory(prev => [...prev, { author: 'System', message: `Error: ${errorMessage}` }]);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
       setChatHistory(prev => [...prev, { author: 'System', message: 'Disconnected from the server.' }]);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [generatedContract]);

  const handleSendMessage = () => {
    if (socket && chatInput.trim()) {
      setIsEditing(true);
      const payload = {
        message: chatInput,
        contract: generatedContract,
      };
      socket.emit('editRequest', payload);
      setChatHistory(prev => [...prev, { author: 'You', message: chatInput }]);
      setChatInput('');
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

              <div className="flex items-center justify-center space-x-4 pt-4">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Generating Draft...' : 'Generate Draft'}
                </Button>
                {process.env.NODE_ENV === 'development' && (
                  <Button
                    variant="link"
                    type="button"
                    onClick={() => setGeneratedContract(MOCK_CONTRACT_DATA)}
                  >
                    (DEV) Bypass Form
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );

  const renderEditor = () => (
    <div className="flex w-full space-x-8 items-start">
      {/* Left side: Document */}
      <div className="flex-1">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Contract Draft</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none relative">
            {isEditing && (
              <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
                <div className="text-center">
                  <p className="text-lg font-semibold">Editing in progress...</p>
                  <p className="text-sm text-gray-600">The AI is applying your changes.</p>
                </div>
              </div>
            )}
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {generatedContract}
            </ReactMarkdown>
          </CardContent>
        </Card>
      </div>
      {/* Right side: Chat */}
      <div className="w-1/3 sticky top-8">
        <Card className="flex flex-col max-h-[calc(100vh-6rem)]">
          <CardHeader>
            <CardTitle>Ask for changes</CardTitle>
            <CardDescription>
              Request changes in plain English.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="h-full border rounded-md p-4 bg-gray-50 space-y-4 overflow-y-auto">
              {chatHistory.map((chat, index) => (
                <div key={index} className="text-sm">
                  <span className="font-bold">{chat.author}: </span>
                  <span>{chat.message}</span>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter>
              <div className="w-full flex space-x-2">
                  <Textarea 
                    placeholder="Ex: Increase salary to $160,000." 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button onClick={handleSendMessage} disabled={isEditing}>
                    {isEditing ? 'Editing...' : 'Send'}
                  </Button>
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
