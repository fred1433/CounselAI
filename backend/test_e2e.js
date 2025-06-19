const axios = require('axios');
const fs = require('fs');

const API_URL = 'http://localhost:3001/api/v1/contracts/generate';
const MODEL_TO_USE = 'gemini-2.5-pro';

const basePayload = {
  employerName: 'Innovatech Solutions',
  employeeName: 'Dr. Evelyn Reed',
  jobTitle: 'Principal Research Scientist, AI Ethics',
  jobDescription: 'Lead foundational research on the long-term societal impacts of AGI.',
  startDate: '2025-08-01',
  hasInitialTerm: false,
  hasNoEndDate: true,
  salary: '$280,000 USD per annum',
  benefits: { 
    health: true, dental: true, vacationSick: true, parking: true,
    profitSharing: true, fourZeroOneK: true, paidBarMembership: false,
    clePaid: false, cellPhone: true,
  },
  prose: 'Governing law is Delaware.',
};

const payloadWithNda = {
  ...basePayload,
  includeNda: true,
  includeNonCompetition: false,
  attyInNotice: false,
};

const payloadWithoutNda = {
  ...basePayload,
  includeNda: false,
  includeNonCompetition: false,
  attyInNotice: false,
};

const payloadWithAttorney = {
  ...basePayload,
  includeNda: false,
  includeNonCompetition: false,
  attyInNotice: true,
  attorneyName: 'Claire Kent, Esq.',
};

async function runTest(payload, testName) {
  console.log(`--- Running test: ${testName} ---`);
  
  const apiPayload = {
    contractData: JSON.stringify(payload),
    model: MODEL_TO_USE,
  };

  try {
    const response = await axios.post(API_URL, apiPayload, {
      headers: { 'Content-Type': 'application/json' },
    });
    
    const generatedContract = response.data.contract;

    if (!generatedContract || generatedContract.length < 100) {
      throw new Error(`Contract generation for ${testName} produced a very short or empty response.`);
    }

    const fileName = `_resultat_${testName}.md`;
    fs.writeFileSync(fileName, generatedContract);
    
    console.log(`✅ SUCCESS: Contract for ${testName} generated and saved to ${fileName}`);
    return true;

  } catch (error) {
    console.error(`--- 🚨 TEST FAILED for ${testName} 🚨 ---`);
    const errorMessage = error.response ? JSON.stringify(error.response.data, null, 2) : error.message;
    console.error(errorMessage);
    return false;
  }
}

async function runAllTests() {
    console.log('--- Full End-to-End Test Suite Started ---');
    
    const resultWithNda = await runTest(payloadWithNda, 'Avec_NDA');
    console.log('\\n' + '-'.repeat(40) + '\\n');
    const resultWithoutNda = await runTest(payloadWithoutNda, 'Sans_NDA');
    console.log('\\n' + '-'.repeat(40) + '\\n');
    const resultWithAttorney = await runTest(payloadWithAttorney, 'Avec_Avocat');
    
    console.log('\\n' + '-'.repeat(40) + '\\n');

    if (resultWithNda && resultWithoutNda && resultWithAttorney) {
        console.log('🎉 All tests completed successfully. Please review the generated files to confirm the output.');
    } else {
        console.error('🔥 One or more tests failed.');
        process.exit(1);
    }
    console.log('--- Test Finished ---');
}

// Give the server a moment to start up
setTimeout(runAllTests, 2000); 