const axios = require('axios');
const fs = require('fs');

const API_URL = 'http://localhost:3001/api/v1/contracts/generate';

const MODELS_TO_TEST = ['gemini-2.5-flash', 'gemini-2.5-pro'];

// A more complex payload to better test the models' capabilities
const testPayload = {
  employerName: 'QuantumLeap AI',
  employeeName: 'Dr. Evelyn Reed',
  jobTitle: 'Principal Research Scientist, AI Ethics',
  jobDescription: 'Lead foundational research on the long-term societal impacts of artificial general intelligence. Develop and champion new frameworks for transparent, equitable, and safe AI. This role requires a PhD in a relevant field and extensive publications.',
  startDate: '2025-08-01',
  hasInitialTerm: true,
  hasNoEndDate: false, // Explicitly false for a term-based contract
  onSitePresence: 'Hybrid, with a minimum of 3 days per week at our San Francisco headquarters.',
  salary: '$280,000 USD per annum',
  benefits: {
    health: true,
    dental: true,
    vacationSick: true,
    parking: true,
    profitSharing: true,
    fourZeroOneK: true,
    paidBarMembership: false,
    clePaid: false,
    cellPhone: true,
  },
  otherBenefits: 'An annual research and conference budget of $15,000. Executive-level life insurance policy. Sabbatical options available after 5 years of service.',
  includeNda: true,
  includeNonCompetition: true,
  attyInNotice: true,
  prose: 'The non-competition clause should be for a duration of 18 months and cover the entire United States. The agreement should be governed by the laws of the State of Delaware. Include a clause for a relocation bonus of $25,000, payable upon starting.',
};


async function runTestForModel(modelName) {
  console.log(`--- Testing model: ${modelName} ---`);
  
  const payload = {
    contractData: JSON.stringify(testPayload),
    model: modelName,
  };

  try {
    const response = await axios.post(API_URL, payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    
    const generatedContract = response.data.contract;

    if (!generatedContract || generatedContract.length < 100) {
      throw new Error(`Contract generation for ${modelName} produced a very short or empty response.`);
    }

    const fileName = `_resultat_${modelName}.md`;
    fs.writeFileSync(fileName, generatedContract);
    
    console.log(`✅ SUCCESS: Contract for ${modelName} generated and saved to ${fileName}`);
    return true;

  } catch (error) {
    console.error(`--- 🚨 TEST FAILED for ${modelName} 🚨 ---`);
    const errorMessage = error.response ? JSON.stringify(error.response.data, null, 2) : error.message;
    console.error(errorMessage);
    return false;
  }
}

async function runAllTests() {
    console.log('--- A/B Model Test Started ---');
    let allTestsPassed = true;

    for (const model of MODELS_TO_TEST) {
        const result = await runTestForModel(model);
        if (!result) {
            allTestsPassed = false;
        }
        console.log('\\n' + '-'.repeat(40) + '\\n');
    }

    if (allTestsPassed) {
        console.log('🎉 All models tested successfully. Please review the generated .md files.');
    } else {
        console.error('🔥 Some model tests failed.');
        process.exit(1);
    }
    console.log('--- A/B Model Test Finished ---');
}


// Give the server a moment to start up
setTimeout(runAllTests, 2000); 