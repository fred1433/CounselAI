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
  CardFooter,
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
      console.log('Backend response:', response.data);
      setGeneratedContract(response.data.contract);
    } catch (error) {
      console.error('Error submitting form:', error);
      // TODO: Display a user-friendly error message
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 sm:p-8">
      <div className="w-full max-w-7xl mx-auto">
        {!generatedContract ? (
          <div className="w-full max-w-4xl mx-auto">
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
                                      Durée Indéterminée (CDI)
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
                                      Durée Déterminée (CDD)
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
                            <FormLabel>Présence sur site</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: 50%" {...field} />
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
                            <FormLabel>Salaire</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: $50,000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Section: Avantages */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold border-b pb-2">Avantages</h3>
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
                            <FormLabel>Autres avantages</FormLabel>
                            <FormControl>
                              <Textarea {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Section: Clauses Additionnelles */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold border-b pb-2">Clauses Additionnelles</h3>
                       <FormField
                        control={form.control}
                        name="includeNda"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Inclure une clause de non-divulgation (NDA) ?</FormLabel>
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
                              <FormLabel className="text-base">Inclure une clause de non-concurrence ?</FormLabel>
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
                              <FormLabel className="text-base">Nommer un avocat dans la clause de notification ?</FormLabel>
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
                      <h3 className="text-lg font-semibold border-b pb-2">Instructions Spécifiques</h3>
                      <FormField
                        control={form.control}
                        name="prose"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Autres éléments ou clauses spécifiques à inclure (en langage courant) :</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Ex: 'Ajouter une clause spécifiant que l'employé doit utiliser son propre matériel informatique.'"
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
                      {isLoading ? 'Génération en cours...' : 'Générer le Brouillon'}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex w-full space-x-8">
            {/* Left side: Document */}
            <div className="flex-1">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Brouillon du Contrat</CardTitle>
                </CardHeader>
                <CardContent className="prose max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-sm">
                    {generatedContract}
                  </pre>
                </CardContent>
              </Card>
            </div>
            {/* Right side: Chat */}
            <div className="w-1/3">
              <Card className="h-full flex flex-col">
                <CardHeader>
                  <CardTitle>Chat</CardTitle>
                  <CardDescription>
                    Demandez des modifications en langage naturel.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="h-full border rounded-md p-2 bg-gray-50">
                    <p className="text-sm text-gray-500">
                      L'historique du chat apparaîtra ici.
                    </p>
                  </div>
                </CardContent>
                <CardFooter>
                    <div className="w-full flex space-x-2">
                        <Textarea placeholder="Ex: Augmente le salaire à 110 000 euros." />
                        <Button>Envoyer</Button>
                    </div>
                </CardFooter>
              </Card>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
