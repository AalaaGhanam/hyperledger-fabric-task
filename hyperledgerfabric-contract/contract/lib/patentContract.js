/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Contract } = require('fabric-contract-api');

const patentStatus = {
    New: {code: 1, text: 'New Patent'},
    Verified: {code: 2, text: 'Patent Verified'},
    Rejected: {code: 3, text: 'Patent Rejected'},
    Published: {code: 4, text: 'Patent Published'}
};

class Patent extends Contract {

     async instantiate(ctx) {

        let emptyList = [];
        await ctx.stub.putState('owners', Buffer.from(JSON.stringify(emptyList)));
        await ctx.stub.putState('verifiers', Buffer.from(JSON.stringify(emptyList)));
        await ctx.stub.putState('publishers', Buffer.from(JSON.stringify(emptyList)));
        await ctx.stub.putState('patents', Buffer.from(JSON.stringify(emptyList)));
    }

    async RegisterOwner(ctx, ownerId, companyName) {

        let owner = {
            id: ownerId,
            companyName: companyName,
            type: 'owner',
            patents: []
        };
        await ctx.stub.putState(ownerId, Buffer.from(JSON.stringify(owner)));

        let data = await ctx.stub.getState('owners');
        if (data) {
            let owners = JSON.parse(data.toString());
            owners.push(ownerId);
            await ctx.stub.putState('owners', Buffer.from(JSON.stringify(owners)));
        } else {
            throw new Error('owners not found');
        }

        return JSON.stringify(owner);
    }

    async RegisterVerifier(ctx, verifierId, companyName) {

        let verifier = {
            id: verifierId,
            companyName: companyName,
            type: 'verifier',
            patents: []
        };
        await ctx.stub.putState(verifierId, Buffer.from(JSON.stringify(verifier)));

        let data = await ctx.stub.getState('verifiers');
        if (data) {
            let verifiers = JSON.parse(data.toString());
            verifiers.push(verifierId);
            await ctx.stub.putState('verifiers', Buffer.from(JSON.stringify(verifiers)));
        } else {
            throw new Error('verifiers not found');
        }

        return JSON.stringify(verifier);
    }

    async RegisterPublisher(ctx, publisherId, companyName) {

        let publisher = {
            id: publisherId,
            companyName: companyName,
            type: 'publisher',
            patents: []
        };
        await ctx.stub.putState(publisherId, Buffer.from(JSON.stringify(publisher)));

        let data = await ctx.stub.getState('publishers');
        if (data) {
            let publishers = JSON.parse(data.toString());
            publishers.push(publisherId);
            await ctx.stub.putState('publishers', Buffer.from(JSON.stringify(publishers)));
        } else {
            throw new Error('publishers not found');
        }

        return JSON.stringify(publisher);
    }

    async CreatePatent(ctx, ownerId, verifierId, patentNumber, industry, priorArt, details) {
        let ownerData = await ctx.stub.getState(ownerId);
        let owner;
        if (ownerData) {
            owner = JSON.parse(ownerData.toString());
            if (owner.type !== 'owner') {
                throw new Error('owner not identified');
            }
        } else {
            throw new Error('owner not found');
        }

        let verifierData = await ctx.stub.getState(verifierId);
        let verifier;
        if (verifierData) {
            verifier = JSON.parse(verifierData.toString());
            if (verifier.type !== 'verifier') {
                throw new Error('verifier not identified');
            }
        } else {
            throw new Error('verifier not found');
        } 

        let patent = {
            patentNumber: patentNumber,
            industry: industry,
            priorArt: priorArt,
            status: JSON.stringify(patentStatus.New),
            owners: [{ownerId: ownerId}],
            details: details,
            verifierId: verifierId,
            publisherId: null,
            publishURL: null,
            publishDate: null,
            rejectionReason: null
        };

        owner.patents.push(patentNumber);
        await ctx.stub.putState(ownerId, Buffer.from(JSON.stringify(owner)));
        await ctx.stub.putState(patentNumber, Buffer.from(JSON.stringify(patent)));
        
        return JSON.stringify(patent);
    }

    async VerifyPatent(ctx, patentNumber, ownerId, verifierId, publisherId) {

        let data = await ctx.stub.getState(patentNumber);
        let patent;
        if (data) {
            patent = JSON.parse(data.toString());
        } else {
            throw new Error('patent not found');
        }

        let ownerData = await ctx.stub.getState(ownerId);
        let owner;
        if (ownerData) {
            owner = JSON.parse(ownerData.toString());
            if (owner.type !== 'owner') {
                throw new Error('owner not identified');
            }
        } else {
            throw new Error('owner not found');
        }

        let verifierData = await ctx.stub.getState(verifierId);
        let verifier;
        if (verifierData) {
            verifier = JSON.parse(verifierData.toString());
            if (verifier.type !== 'verifier') {
                throw new Error('verifier not identified');
            }
        } else {
            throw new Error('verifier not found');
        }

        let publisherData = await ctx.stub.getState(publisherId);
        let publisher;
        if (publisherData) {
            publisher = JSON.parse(publisherData.toString());
            if (publisher.type !== 'publisher') {
                throw new Error('publisher not identified');
            }
        } else {
            throw new Error('publisher not found');
        }

        if (patent.status == JSON.stringify(patentStatus.New)) {
            patent.status = JSON.stringify(patentStatus.Verified);
            patent.publisherId = publisherId;
            await ctx.stub.putState(patentNumber, Buffer.from(JSON.stringify(patent)));

            verifier.patents.push(patentNumber);
            await ctx.stub.putState(verifierId, Buffer.from(JSON.stringify(verifier)));

            return JSON.stringify(patent);
        } else {
            throw new Error('patent not created');
        }
    }

    async RejectPatent(ctx, patentNumber, ownerId, verifierId, rejectionReason) {

        let data = await ctx.stub.getState(patentNumber);
        let patent;
        if (data) {
            patent = JSON.parse(data.toString());
        } else {
            throw new Error('patent not found');
        }
        let ownerData = await ctx.stub.getState(ownerId);
        let owner;
        if (ownerData) {
            owner = JSON.parse(ownerData.toString());
            if (owner.type !== 'owner') {
                throw new Error('owner not identified');
            }
        } else {
            throw new Error('owner not found');
        }

        let verifierData = await ctx.stub.getState(verifierId);
        let verifier;
        if (verifierData) {
            verifier = JSON.parse(verifierData.toString());
            if (verifier.type !== 'verifier') {
                throw new Error('verifier not identified');
            }
        } else {
            throw new Error('verifier not found');
        }

        if (patent.status == JSON.stringify(patentStatus.New)) {
            patent.status = JSON.stringify(patentStatus.Rejected);
            patent.rejectionReason = rejectionReason;
            await ctx.stub.putState(patentNumber, Buffer.from(JSON.stringify(patent)));

            verifier.patents.push(patentNumber);
            await ctx.stub.putState(verifierId, Buffer.from(JSON.stringify(verifier)));

            return JSON.stringify(patent);
        } else {
            throw new Error('patent not created');
        }
    }

    async PublishPatent(ctx, patentNumber, ownerId, publisherId, publishURL, publishDate) {

        let data = await ctx.stub.getState(patentNumber);
        let patent;
        if (data) {
            patent = JSON.parse(data.toString());
        } else {
            throw new Error('patent not found');
        }
        let ownerData = await ctx.stub.getState(ownerId);
        let owner;
        if (ownerData) {
            owner = JSON.parse(ownerData.toString());
            if (owner.type !== 'owner') {
                throw new Error('owner not identified');
            }
        } else {
            throw new Error('owner not found');
        }

        let publisherData = await ctx.stub.getState(publisherId);
        let publisher;
        if (publisherData) {
            publisher = JSON.parse(publisherData.toString());
            if (publisher.type !== 'publisher') {
                throw new Error('publisher not identified');
            }
        } else {
            throw new Error('publisher not found');
        }

        if (patent.status == JSON.stringify(patentStatus.Verified)) {
            patent.status = JSON.stringify(patentStatus.Published);
            patent.publishURL = publishURL;
            patent.publishDate =publishDate;
            await ctx.stub.putState(patentNumber, Buffer.from(JSON.stringify(patent)));

            publisher.patents.push(patentNumber);
            await ctx.stub.putState(publisherId, Buffer.from(JSON.stringify(publisher)));

            return JSON.stringify(patent);
        } else {
            throw new Error('patent not verified');
        }
    }

    async GetState(ctx, key) {
        let data = await ctx.stub.getState(key);
        let jsonData = JSON.parse(data.toString());
        return JSON.stringify(jsonData);
    }
}

module.exports = Patent;