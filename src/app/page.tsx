'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { contractSchema, ContractFormData } from '@/lib/validation/contract-schema';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import axios from 'axios';

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
  const form = useForm<ContractFormData>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      employerName: '',
      employeeName: '',
      jobTitle: '',
      jobDescription: '',
      startDate: '',
      hasInitialTerm: false,
      hasNoEndDate: true,
      onSitePresence: '',
      salary: '',
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
      otherBenefits: '',
      includeNda: false,
      includeNonCompetition: false,
      attyInNotice: false,
      prose: '',
    },
  });

  async function onSubmit(data: ContractFormData) {
    try {
      const response = await axios.post('http://localhost:3001/api/v1/contracts/generate', data);
      console.log('Backend response:', response.data);
      // TODO: Handle navigation to the next step (co-editing view)
    } catch (error) {
      console.error('Error submitting form:', error);
      // TODO: Display a user-friendly error message
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 sm:p-8">
      <div className="w-full max-w-4xl">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Assistant de Création : Contrat de Travail</CardTitle>
            <CardDescription>
              Remplissez les champs ci-dessous pour générer un premier brouillon de contrat.
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
                          <FormLabel>Nom de l&apos;employeur</FormLabel>
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
                          <FormLabel>Nom de l&apos;employé(e)</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Section: Poste */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Poste</h3>
                  <FormField
                    control={form.control}
                    name="jobTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Titre du poste</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Ingénieur Logiciel Senior" {...field} />
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
                        <FormLabel>Description du poste</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Décrire les principales responsabilités, les tâches quotidiennes, et les objectifs du poste..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Section: Termes */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Termes du contrat</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date de début</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="space-y-2">
                      <FormLabel>Durée</FormLabel>
                      <div className="flex items-center space-x-4 pt-2">
                        <FormField
                          control={form.control}
                          name="hasInitialTerm"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Terme initial défini</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="hasNoEndDate"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Date de fin indéterminée</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                  <FormField
                    control={form.control}
                    name="onSitePresence"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Présence sur site requise</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Temps plein, 3 jours par semaine..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Section: Compensation */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Rémunération</h3>
                  <FormField
                    control={form.control}
                    name="salary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Salaire</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: 80,000 € par an" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Section: Avantages */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Avantages (Benefits)</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {benefitOptions.map((item) => (
                      <FormField
                        key={item.id}
                        control={form.control}
                        name={`benefits.${item.id}`}
                        render={({ field }) => (
                          <FormItem
                            className="flex flex-row items-start space-x-3 space-y-0"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">
                              {item.label}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                    <FormField
                        control={form.control}
                        name="otherBenefits"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Autres avantages</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="Décrire tout autre avantage non listé ci-dessus..."
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Section: Clauses Additionnelles */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Clauses Additionnelles</h3>
                  <div className="flex flex-col space-y-2">
                    <FormField
                      control={form.control}
                      name="includeNda"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel>Inclure une clause de non-divulgation (NDA) ?</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="includeNonCompetition"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel>Inclure une clause de non-concurrence ?</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="attyInNotice"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel>Avocat à nommer dans la clause de notification ?</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Section: Autres clauses */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Autres éléments ou clauses spécifiques</h3>
                     <FormField
                        control={form.control}
                        name="prose"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Décrivez ici, en langage courant, toute autre demande spécifique ou clause à inclure.</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="Ex: 'Je veux une clause qui stipule que le matériel informatique fourni reste la propriété de l'entreprise.'"
                                        rows={4}
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <Button type="submit">Générer le Brouillon</Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
} 