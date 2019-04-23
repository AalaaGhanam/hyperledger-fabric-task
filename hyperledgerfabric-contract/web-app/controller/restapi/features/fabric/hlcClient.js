/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


'use strict';
let fs = require('fs');
let path = require('path');

let itemTable = null;
const svc = require('./Z2B_Services');
const financeCoID = 'easymoney@easymoneyinc.com';

// Bring Fabric SDK network class
const { FileSystemWallet, Gateway } = require('fabric-network');

// A wallet stores a collection of identities for use
let walletDir = path.join(path.dirname(require.main.filename),'controller/restapi/features/fabric/_idwallet');
const wallet = new FileSystemWallet(walletDir);

const ccpPath = path.resolve(__dirname, 'connection.json');
const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
const ccp = JSON.parse(ccpJSON);

/**
 * orderAction - act on an order for a buyer
 * @param {express.req} req - the inbound request object from the client
 * req.body.action - string with buyer requested action
 * buyer available actions are:
 * Pay  - approve payment for an order
 * Dispute - dispute an existing order. requires a reason
 * Purchase - submit created order to seller for execution
 * Cancel - cancel an existing order
 * req.body.participant - string with buyer id
 * req.body.orderNo - string with orderNo to be acted upon
 * req.body.reason - reason for dispute, required for dispute processing to proceed
 * @param {express.res} res - the outbound response object for communicating back to client
 * @param {express.next} next - an express service to enable post processing prior to responding to the client
 * @returns {Array} an array of assets
 * @function
 */
exports.patentAction = async function (req, res, next) {
    let method = 'patentAction';
    // Main try/catch block
    try {

        // A gateway defines the peers used to access Fabric networks
        const gateway = new Gateway();
        await gateway.connect(ccp, { wallet, identity: 'User1@org1.example.com', discovery: { enabled: false } });

        // Get addressability to network
        const network = await gateway.getNetwork('mychannel');

        // Get addressability to  contract
        const contract = await network.getContract('patentcontract');

        // Get state of patent
        const responsePatent = await contract.evaluateTransaction('GetState', req.body.patentNo);
        console.log('responsePatent: ');
        console.log(JSON.parse(responsePatent.toString()));
        let patent = JSON.parse(JSON.parse(responsePatent.toString()));
        
        // Perform action on the order
        switch (req.body.action)
        {
        case 'Verify':
            console.log('VerifyPatent entered');
            console.log(req.body.publisherId);
            const verifyResponse = await contract.submitTransaction('VerifyPatent', patent.patentNumber, patent.owners[0].ownerId, patent.verifierId, req.body.publisherId);
            console.log('verify_response: ');
            console.log(JSON.parse(verifyResponse.toString()));
            break;
        case 'Reject':
            console.log('RejectPatent entered');
            const rejectResponse = await contract.submitTransaction('RejectPatent', patent.patentNumber, patent.owners[0].ownerId, patent.verifierId);
            console.log('reject_response: ');
            console.log(JSON.parse(rejectResponse.toString()));            
            break;
        case 'Publish':
            console.log('PublishPatent entered');
            const publishResponse = await contract.submitTransaction('PublishPatent', patent.patentNumber, patent.owners[0].ownerId, patent.publisherId);
            console.log('publish_response: ');
            console.log(JSON.parse(publishResponse.toString()));             
            break;
        default :
            console.log('default entered for action: '+req.body.action);
            res.send({'result': 'failed', 'error':' order '+req.body.orderNo+' unrecognized request: '+req.body.action});
        }
        
        // Disconnect from the gateway
        console.log('Disconnect from Fabric gateway.');
        console.log('orderAction Complete');
        await gateway.disconnect();
        res.send({'result': ' order '+req.body.patentNo+' successfully updated to '+req.body.action});
            
    } catch (error) {
        console.log(`Error processing transaction. ${error}`);
        console.log(error.stack);
        res.send({'error': error.stack});
    } 

};

/**
 * adds an order to the blockchain
 * @param {express.req} req - the inbound request object from the client
 * req.body.seller - string with seller id
 * req.body.buyer - string with buyer id
 * req.body.items - array with items for order
 * @param {express.res} res - the outbound response object for communicating back to client
 * @param {express.next} next - an express service to enable post processing prior to responding to the client
 * @returns {Array} an array of assets
 * @function
 */
exports.addPatent = async function (req, res, next) {
    let method = 'addPatent';
    console.log(method+' req.body.owner is: '+req.body.owner);    
    let patentNumber = '00' + Math.floor(Math.random() * 10000);
    try {
        const gateway = new Gateway();
        await gateway.connect(ccp, { wallet, identity: 'User1@org1.example.com', discovery: { enabled: false } });
        const network = await gateway.getNetwork('mychannel');

        const contract = await network.getContract('patentcontract');

        const createPatentResponse = await contract.submitTransaction('CreatePatent', req.body.ownerId, req.body.verifierId, patentNumber, req.body.industry, req.body.priorArt, req.body.details);
        console.log('createPatentResponse: ')
        console.log(JSON.parse(createPatentResponse.toString()));

        console.log('Disconnect from Fabric gateway.');
        console.log('add Patent Complete');
        await gateway.disconnect();
        res.send({'result': ' patent '+patentNumber+' successfully added'});

    } catch (error) {
        console.log(`Error processing transaction. ${error}`);
        console.log(error.stack);
        res.send({'error': error.stack});
    } 
    
};

exports.getPublisherPatents = async function(req, res, next) {

    console.log('getPublisherPatents');
    let allPatents = new Array();

    // Main try/catch block
    try {

        // A gateway defines the peers used to access Fabric networks
        const gateway = new Gateway();
        await gateway.connect(ccp, { wallet, identity: 'User1@org1.example.com', discovery: { enabled: false } });

        // Get addressability to network
        const network = await gateway.getNetwork('mychannel');

        // Get addressability to  contract
        const contract = await network.getContract('patentcontract');
        
        const responseVerifier = await contract.evaluateTransaction('GetState', "verifiers");
        console.log('responseVerifier: ');
        console.log(JSON.parse(responseVerifier.toString()));
        var verifiers = JSON.parse(JSON.parse(responseVerifier.toString()));

        for (let verifier of verifiers) { 
            const verifierResponse = await contract.evaluateTransaction('GetState', verifier);
            console.log('response: ');
            console.log(JSON.parse(verifierResponse.toString()));
            var _verifierjsn = JSON.parse(JSON.parse(verifierResponse.toString()));       
            
            for (let patentNo of _verifierjsn.patents) { 
                const response = await contract.evaluateTransaction('GetState', patentNo);
                console.log('response: ');
                console.log(JSON.parse(response.toString()));
                var _jsn = JSON.parse(JSON.parse(response.toString()));
                if(_jsn.publisherId==req.body.publisherId){
                    allPatents.push(_jsn);    
                }
            }                           
        }
        
        // Disconnect from the gateway
        console.log('Disconnect from Fabric gateway.');
        console.log('getPublisherPatent Complete');
        await gateway.disconnect();
        res.send({'result': 'success', 'patents': allPatents});
        
    } catch (error) {
        console.log(`Error processing transaction. ${error}`);
        console.log(error.stack);
        res.send({'error': error.stack});
    } 
};

exports.getVerifierPatents = async function(req, res, next) {

    console.log('getVerifierPatents');
    let allPatents = new Array();

    // Main try/catch block
    try {

        // A gateway defines the peers used to access Fabric networks
        const gateway = new Gateway();
        await gateway.connect(ccp, { wallet, identity: 'User1@org1.example.com', discovery: { enabled: false } });

        // Get addressability to network
        const network = await gateway.getNetwork('mychannel');

        // Get addressability to  contract
        const contract = await network.getContract('patentcontract');
        
        const responseOwner = await contract.evaluateTransaction('GetState', "verifiers");
        console.log('responseOwner: ');
        console.log(JSON.parse(responseOwner.toString()));
        var owners = JSON.parse(JSON.parse(responseOwner.toString()));

        for (let owner of owners) { 
            const ownerResponse = await contract.evaluateTransaction('GetState', owner);
            console.log('response: ');
            console.log(JSON.parse(ownerResponse.toString()));
            var _ownerjsn = JSON.parse(JSON.parse(ownerResponse.toString()));       
            
            for (let patentNo of _ownerjsn.patents) { 
                const response = await contract.evaluateTransaction('GetState', patentNo);
                console.log('response: ');
                console.log(JSON.parse(response.toString()));
                var _jsn = JSON.parse(JSON.parse(response.toString()));
                if(_jsn.verifierId==req.body.verifierId){
                    allPatents.push(_jsn);    
                }
            }                           
        }
        
        // Disconnect from the gateway
        console.log('Disconnect from Fabric gateway.');
        console.log('getVerifierIdPatents Complete');
        await gateway.disconnect();
        res.send({'result': 'success', 'patents': allPatents});
        
    } catch (error) {
        console.log(`Error processing transaction. ${error}`);
        console.log(error.stack);
        res.send({'error': error.stack});
    } 
};