const axios = require('axios');
const { io } = require('socket.io-client');

const API_URL = 'http://localhost:3001/api/v1/contracts/generate';
const WS_URL = 'http://localhost:3001';

const testPayload = {
  employerName: 'TestCorp',
  employeeName: 'Jane Tester',
  jobTitle: 'Quality Assurance',
  jobDescription: 'Testing everything.',
  startDate: '2025-01-01',
  hasInitialTerm: false,
  hasNoEndDate: true,
  onSitePresence: '100%',
  salary: '$50,000',
  benefits: {
    health: true,
    dental: false,
    vacationSick: true,
    parking: false,
    profitSharing: false,
    fourZeroOneK: true,
    paidBarMembership: false,
    clePaid: false,
    cellPhone: false,
  },
  otherBenefits: 'Annual bonus based on performance.',
  includeNda: true,
  includeNonCompetition: false,
  attyInNotice: true,
  prose: 'The employee must receive a new laptop.',
};

const editInstruction = 'Change the salary to $95,000 per year and the job title to "Senior Tester".';

async function runTest() {
  let initialContract = '';
  console.log('--- E2E Test Started ---');

  try {
    // 1. Generate Contract
    console.log('Step 1: Generating initial contract...');
    const response = await axios.post(API_URL, testPayload);
    initialContract = response.data.contract;

    if (!initialContract || !initialContract.includes('50,000')) {
      throw new Error('Contract generation failed or did not contain the initial salary.');
    }
    console.log('✅ Initial contract generated successfully.');
    
    // 2. Connect via WebSocket and request edit
    console.log('\nStep 2: Connecting to WebSocket and requesting edit...');
    const socket = io(WS_URL, { reconnection: false });

    const editPromise = new Promise((resolve, reject) => {
      socket.on('connect', () => {
        console.log('✅ WebSocket connected.');
        socket.emit('editRequest', {
          contract: initialContract,
          message: editInstruction,
        });
        console.log('📤 Edit request sent.');
      });

      socket.on('contractUpdated', (newContract) => {
        console.log('✅ "contractUpdated" event received.');
        resolve(newContract);
        socket.disconnect();
      });
      
      socket.on('editError', (error) => {
        reject(new Error(`Received editError: ${error}`));
        socket.disconnect();
      });

      socket.on('connect_error', (err) => {
        reject(new Error(`Connection failed: ${err.message}`));
      });
    });

    const newContract = await editPromise;

    // 3. Verify the result
    console.log('\nStep 3: Verifying the edited contract...');
    if (typeof newContract !== 'string') {
        throw new Error(`Test Failed: newContract is not a string, but ${typeof newContract}`);
    }
    const salaryUpdated = newContract.includes('95,000');
    const titleUpdated = newContract.includes('Senior Tester');

    if (salaryUpdated && titleUpdated) {
      console.log('✅ SUCCESS: Salary and Title were updated correctly.');
    } else {
      throw new Error(`Test Failed: Salary updated: ${salaryUpdated}, Title updated: ${titleUpdated}`);
    }

  } catch (error) {
    console.error('\n--- 🚨 TEST FAILED 🚨 ---');
    console.error(error.message);
    process.exit(1);
  } finally {
    console.log('\n--- E2E Test Finished ---');
  }
}

// Give the server a moment to start up
setTimeout(runTest, 2000); 