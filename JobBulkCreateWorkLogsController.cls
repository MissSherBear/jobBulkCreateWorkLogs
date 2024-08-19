public with sharing class JobBulkCreateWorkLogsController {
    public static Id recordId;

    @AuraEnabled(cacheable=true)
    public static sitetracker__Job__c getJobRecord(Id recordId) {
        // check if recordId is null and set it to current page recordId
        if (recordId == null) {
            // Add null check for System.currentPageReference()
            if (System.currentPageReference() != null && System.currentPageReference().getParameters() != null) {
                recordId = System.currentPageReference().getParameters().get('id');
            }
        }
    
        System.debug('recordId: ' + recordId);
        return [SELECT Id, Name FROM sitetracker__Job__c WHERE Id = :recordId ];
    }

    @AuraEnabled
    public static String getJobName(Id recordId) {
        return getJobRecord(recordId).Name;
    }

    @AuraEnabled(cacheable=true)
    public static List<sitetracker__Finance__c> getRelatedFinanceLines(Id recordId) {
        return [
            SELECT Id, Name, sitetracker__PO_Line_Item__c, Short_Description__c, Price_Per_Unit_Formula__c, sitetracker__Pricebook_Item__c 
            FROM sitetracker__Finance__c 
            WHERE Job__c = :recordId AND (Finance_Line_Type__c = 'Standard' OR Finance_Line_Type__c = 'Child')
        ];
    }

    @AuraEnabled
    public static void createWorkLogs(List<Work_Log__c> workLogs) {
        if (workLogs != null && !workLogs.isEmpty()) {
            for (Work_Log__c workLog : workLogs) {
                if (workLog.Assigned_Resource__c == null) {
                    throw new AuraHandledException('Assigned Resource is required');
                }
                if (workLog.Work_Date__c == null) {
                    throw new AuraHandledException('Work Date is required');
                }
                workLog.Assigned_Resource__c = workLog.Assigned_Resource__c;
                workLog.Work_Date__c = workLog.Work_Date__c;
                workLog.Notes_Comments__c = workLog.Notes_Comments__c;
                workLog.Ticket__c = workLog.Ticket__c;
                workLog.Starting_Point__c = workLog.Starting_Point__c;
                workLog.Ending_Point__c = workLog.Ending_Point__c;
                workLog.Access_Point__c = workLog.Access_Point__c;
                workLog.Page__c = workLog.Page__c;
                workLog.Finance__c = workLog.Finance__c;
                workLog.Claimed_QTY__c = workLog.Claimed_QTY__c;
                workLog.Unbillable__c = workLog.Unbillable__c;
                workLog.Claiming_Source__c = workLog.Claiming_Source__c;

                System.debug('workLog: ' + workLog);
                System.debug('Assigned Resource: ' + workLog.Assigned_Resource__c);

            }

            insert workLogs;
            System.debug('Inserted workLogs: ' + workLogs);
        
        }
        }
    //         }
    //         workLog.Assigned_Resource__c = assignedResource;
    //         workLog.Work_Date__c = workDate;
    //         workLog.Notes_Comments__c = notesComments;
    //         workLog.Finance__c = finance;
    //         workLog.Claimed_QTY__c = claimedQTY;
    //         workLogs.add(workLog);
    //         System.debug('workLogs: ' + workLogs);
    //         // List<Work_Log__c> workLogsToInsert = new List<Work_Log__c>();
    //         // for (Work_Log__c workLog : workLogs) {
    //         //     workLogsToInsert.add(workLog);
    //         // }
    //         // System.debug('workLogsToInsert: ' + workLogsToInsert);
    //         System.debug('workLogs: ' + workLogs);
    //         insert workLogs;
    //     }
    // }
}
