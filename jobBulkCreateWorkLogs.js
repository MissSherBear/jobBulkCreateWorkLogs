import { LightningElement, api, wire, track } from 'lwc';
import getJobRecord from '@salesforce/apex/JobBulkCreateWorkLogsController.getJobRecord';
import getRelatedFinanceLines from '@salesforce/apex/JobBulkCreateWorkLogsController.getRelatedFinanceLines';
import createWorkLogs from '@salesforce/apex/JobBulkCreateWorkLogsController.createWorkLogs';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getRecord, createRecord } from 'lightning/uiRecordApi';

export default class JobBulkCreateWorkLogs extends LightningElement {
    @api recordId; // Current Job record Id
    @track jobRecord = {};
    @track financeLines = [];
    @track filteredFinanceLines = [];
    @track draftValues = [];
    @track error;
    @track today = new Date().toISOString().slice(0, 10);
    @track jobName;
    @track Assigned_Resource__c;
    @track Work_Date__c;
    @track Notes_Comments__c;
    @track isLoading = false;
    @track showConfirmation = false;
    @track createdWorkLogs = [];
    @track isSaveDisabled = true;

    @track columns = [
        { label: 'Finance Line', fieldName: 'Name' },
        { label: 'Article', fieldName: 'sitetracker__PO_Line_Item__c' },
        { label: 'Description', fieldName: 'Short_Description__c' },
        { label: 'Price Per Unit', fieldName: 'Price_Per_Unit_Formula__c', type: 'currency', cellAttributes: { alignment: 'left' }, },
        { label: 'Claimed Quantity', fieldName: 'Claimed_QTY__c', type: 'number', editable: true, cellAttributes: { iconName: 'utility:edit' } },
        { label: 'Unbillable?', fieldName: 'Unbillable__c', editable: true, type: 'boolean', cellAttributes: { iconName: 'utility:new_direct_message' } }
    ];

    @track confirmationColumns = [
        { label: 'Work Log Name', fieldName: 'Name'},
        { label: 'Assigned Resource', fieldName: 'Assigned_Resource__c' },
        { label: 'Work Date', fieldName: 'Work_Date__c' },
        { label: 'Notes/Comments', fieldName: 'Notes_Comments__c' },
        { label: 'Finance Line', fieldName: 'Finance__c' },
        { label: 'Claimed Quantity', fieldName: 'Claimed_QTY__c', type: 'number' },
        { label: 'Unbillable?', fieldName: 'Unbillable__c', type: 'boolean' }
    ];

    _recordId;

@api set jobId(value) {
    this._recordId = value;

    // do your thing right here with this.recordId / value
}

get jobId() {
    return this._recordId;
}

renderedCallback() {
    console.log('renderedCallback Record ID:', this.recordId);
}


    @wire(getRecord, { recordId: '$recordId', fields: ['sitetracker__Job__c.Name'] }) 

    wiredRecord({ error, data }) {
        if (data) {
            this.jobRecord = data;
            this.jobName = data.fields.Name.value;
            console.log('wiredRecord: jobRecord: ', this.jobRecord);
        } else if (error) {
            console.log('wiredRecord error: ', JSON.stringify(error));
        }
    }

    connectedCallback() {
        console.log('connectedCallback Record ID:', this.recordId);
        this.loadJobRecord();
        this.loadRelatedFinanceLines();
    }

    loadJobRecord() {
        console.log('loadJobRecord Record ID:', this.recordId);
        getJobRecord({ recordId: this.recordId })
            .then(result => {
                this.jobRecord = result;
                console.log('loadJobRecord result: ', result);
            })
            .catch(() => {
                this.error = error;

            });
    }

    loadRelatedFinanceLines() {
        console.log('loadRelatedFinanceLines Record ID:', this.recordId);
        getRelatedFinanceLines({ recordId: this.recordId })
            .then(result => {
                this.financeLines = result.map(financeLine => ({
                    ...financeLine,
                    Claimed_QTY__c: financeLine.Claimed_QTY__c || null // Initialize Claimed_QTY__c field if not already set
                }));
                this.filteredFinanceLines = [...this.financeLines];
                this.updateSaveButtonState();
                console.log('loadRelatedFinanceLines result: ', this.financeLines);
            })
            .catch(error => {
                this.error = error;
                console.log('loadRelatedFinanceLines error:', error);
            });
    }

    handleSearch(event) {
        const searchKey = event.target.value.toLowerCase();
        if (searchKey) {
            // Filter the list based on the search key but don't reset the original financeLines
            this.filteredFinanceLines = this.financeLines.filter(line => 
                line.sitetracker__PO_Line_Item__c && line.sitetracker__PO_Line_Item__c.toLowerCase().includes(searchKey)
            );
        } else {
            // If the search is cleared, show all the finance lines without losing data
            this.filteredFinanceLines = this.financeLines;
        }
    }

    handleClaimedQtyChange(event) {
        const financeId = event.target.dataset.id;
        const claimedQty = event.target.value;
        this.filteredFinanceLines = this.filteredFinanceLines.map(finance => 
            (finance.Id === financeId ? { ...finance, Claimed_QTY__c: claimedQty } : finance)
        );
        // Sync the claimedQty change with financeLines to persist values across filters
        this.financeLines = this.financeLines.map(finance => 
            (finance.Id === financeId ? { ...finance, Claimed_QTY__c: claimedQty } : finance)
        );

        this.updateSaveButtonState();
        console.log('handleClaimedQtyChange finance: ', financeId);
        console.log('handleClaimedQtyChange finance.Claimed_QTY__c: ', financeId.Claimed_QTY__c);
        console.log('handleClaimedQtyChange this.filteredFinanceLines: ', this.filteredFinanceLines);

    }

    handleUnbillableChange(event) {
        const financeId = event.target.dataset.id;
        const unbillable = event.target.checked;
        this.filteredFinanceLines = this.filteredFinanceLines.map(finance => 
            (finance.Id === financeId ? { ...finance, Unbillable__c: unbillable } : finance)
        );
        // Sync the unbillable change with financeLines to persist values across filters
        this.financeLines = this.financeLines.map(finance => 
            (finance.Id === financeId ? { ...finance, Unbillable__c: unbillable } : finance)
        );
        console.log('handleUnbillableChange unbillable: ', unbillable);
    }

    updateSaveButtonState() {
        this.isSaveDisabled = this.filteredFinanceLines.every(finance => !finance.Claimed_QTY__c);
    }

    handleSave(event) {
        console.log('Clicked handleSave button' );
        
        this.isLoading = true;
        const assignedResourceField = this.template.querySelector('[data-id="assignedResource"]');
        const workDateField = this.template.querySelector('[data-id="workDate"]');
        const notesCommentsField = this.template.querySelector('[data-id="notesComments"]');
        const ticketField = this.template.querySelector('[data-id="ticket"]');
        const startingPointField = this.template.querySelector('[data-id="startingPoint"]');
        const endingPointField = this.template.querySelector('[data-id="endingPoint"]');
        const accessPointField = this.template.querySelector('[data-id="accessPoint"]');
        const pageField = this.template.querySelector('[data-id="page"]');

        // Verify that Assigned_Resource__c is not blank
    if (!assignedResourceField.value) {
        assignedResourceField.reportValidity();
        this.isLoading = false;  // Reset isLoading state
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Error',
                message: 'Assigned Resource is required',
                variant: 'error'
            })
        );
        return;
    }

    // Verify that workDateField is not blank
    if (!workDateField.value) {
        workDateField.reportValidity();
        this.isLoading = false;  // Reset isLoading state
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Error',
                message: 'Work Date is required',
                variant: 'error'
            })
        );
        return;
    }
    
        const assignedResource = assignedResourceField.value;
        const workDate = workDateField.value;
        const notesComments = notesCommentsField.value;
        const ticket = ticketField.value;
        const startingPoint = startingPointField.value;
        const endingPoint = endingPointField.value;
        const accessPoint = accessPointField.value;
        const page = pageField.value;

        console.log('assignedResource: ', assignedResource);
        console.log('workDate: ', workDate);

        // const draftValues = event.detail.draftValues;
        const financeLines = this.filteredFinanceLines.map(finance => {
            const claimedQtyInput = this.template.querySelector(`input[name="input1"][data-id="${finance.Id}"]`);
            const unbillableCheckbox = this.template.querySelector(`input[name="unbillable"][data-id="${finance.Id}"]`);
    
            return {
                ...finance,
                Claimed_QTY__c: claimedQtyInput ? claimedQtyInput.value : finance.Claimed_QTY__c,
                Unbillable__c: unbillableCheckbox ? unbillableCheckbox.checked : finance.Unbillable__c
            };
            
        });

        const financeLinesList = financeLines.filter(finance => finance.Claimed_QTY__c !== null);
        this.updateSaveButtonState();

        if (this.isSaveDisabled) {
            this.isLoading = false;
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: 'You must enter a Claimed Quantity for at least one finance line',
                    variant: 'error'
                })
            );
            return;
        }

        console.log('financeLines: ', financeLinesList);

        const workLogs = financeLinesList.map(finance => ({
            apiName: 'Work_Log__c',
            fields: {
                Assigned_Resource__c: assignedResource,
                Work_Date__c: workDate,
                Notes_Comments__c: notesComments,
                Ticket__c: ticket,
                Starting_Point__c: startingPoint,
                Ending_Point__c: endingPoint,
                Access_Point__c: accessPoint,
                Page__c: page,
                Finance__c: finance.Id,
                Claimed_QTY__c: this.claimedQty || finance.Claimed_QTY__c, // Use claimedQty from handleChange
                Unbillable__c: this.unbillable !== undefined ? this.unbillable : finance.Unbillable__c, // Use unbillable from handleChange
                Claiming_Source__c: 'ST - Bulk'
            }
        }));

        const promises = workLogs.map(finance => createRecord(finance));
        
        Promise.all(promises)
            .then(results => {
                this.createdWorkLogs = results.map(result => {
                    return {
                        Id: result.id,
                        Name: result.fields.Name.value,
                        Assigned_Resource__c: result.fields.Assigned_Resource__r.value.fields.Name.value,
                        Work_Date__c: result.fields.Work_Date__c.value,
                        Notes_Comments__c: result.fields.Notes_Comments__c.value,
                        Finance__c: result.fields.Finance__r.value.fields.Name.value,
                        Claimed_QTY__c: result.fields.Claimed_QTY__c.value,
                        Unbillable__c: result.fields.Unbillable__c.value
                    };
                });

                console.log('createdWorkLogs: ', this.createdWorkLogs);
                this.showConfirmation = true;
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Success',
                        message: 'Work Logs created successfully',
                        variant: 'success'
                    })
                );

                this.isLoading = false;
            })
            .catch(error => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error',
                        message: 'Error creating Work Logs : ' + JSON.stringify(error.body.message)
                            .substring(0, 99) + (error.body.message.length > 100 ? '...' : ''),
                        variant: 'error'
                    })
                );
                console.log('Error creating work logs: ' + JSON.stringify(error));
                this.isLoading = false;
            });
    }

    handleCloseConfirmation() {
        this.showConfirmation = false;
        this.createdWorkLogs = [];
        window.location.reload();
    }

}
