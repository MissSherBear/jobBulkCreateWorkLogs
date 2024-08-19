@isTest
public class JobBulkCreateWorkLogsControllerTest {

    @testSetup
    static void setupTestData() {
        sitetracker__Project_Template__c template = new sitetracker__Project_Template__c(
            Name = 'Test class Project Template',
            sitetracker__Active__c = true
        );

        insert template;

        sitetracker__Site__c site = new sitetracker__Site__c(
            Name = 'Test class Site'
        );

        insert site;

        sitetracker__Project__c project = new sitetracker__Project__c(
            sitetracker__Site__c = site.Id,
            sitetracker__ProjectTemplate__c = template.Id
        );

        insert project;

        // Create test Programs
        sitetracker__Program2__c program = new sitetracker__Program2__c(
            Name = 'Test Program'
        );
        
        insert program;

        // Create test Project Price Books
        List<sitetracker__Project_Price_Book__c> projectPriceBooks = new List<sitetracker__Project_Price_Book__c>();
        for (Integer i = 0; i < 2; i++) {
            projectPriceBooks.add(new sitetracker__Project_Price_Book__c(
                Name = 'Test Project Price Book ' + i, 
                Program__c = program.Id, 
                sitetracker__Project_Template__c = template.Id
            ));
        }

        insert projectPriceBooks;

        // Create test Price Book Items
        sitetracker__Pricebook_Item__c pbi = new sitetracker__Pricebook_Item__c(
            Name = 'Test Price Book Item',
            sitetracker__Project_Price_Book__c = projectPriceBooks[0].Id,
            Price_Per_Unit__c = 2.00
        );

        insert pbi;

        // Create a test job record
        sitetracker__Job__c job = new sitetracker__Job__c(
            Name = 'Test Job',
            Project_Price_Book__c = projectPriceBooks[0].Id,
            sitetracker__Project__c = project.Id
        );
        insert job;

        // Create test Finances
        List<sitetracker__Finance__c> finances = new List<sitetracker__Finance__c>();
        for (Integer i = 0; i < 5; i++) {
            finances.add(new sitetracker__Finance__c(
                Job__c = job.Id,
                sitetracker__Pricebook_Item__c = pbi.Id
            ));
        }
        insert finances;
        
        sitetracker__Timesheet_User__c assignedResource = new sitetracker__Timesheet_User__c(
            Name = 'Test Assigned Resource',
            sitetracker__Enable_Resource_For__c = 'Timesheets');
        insert assignedResource;
    }

    @isTest
    static void testGetJobRecord() {
        // Fetch the test job record created in the test setup
        sitetracker__Job__c job = [SELECT Id, Name FROM sitetracker__Job__c LIMIT 1];
        
        // Call the method and assert the job is returned
        sitetracker__Job__c fetchedJob = JobBulkCreateWorkLogsController.getJobRecord(job.Id);
        System.assertNotEquals(null, fetchedJob, 'Job should not be null');
        System.assertEquals(job.Id, fetchedJob.Id, 'Job Ids should match');
    }

    @isTest
    static void testGetRelatedFinanceLines() {
        // Fetch the test job record created in the test setup
        sitetracker__Job__c job = [SELECT Id FROM sitetracker__Job__c LIMIT 1];
        
        // Call the method and assert the correct number of finance lines are returned
        List<sitetracker__Finance__c> financeLines = JobBulkCreateWorkLogsController.getRelatedFinanceLines(job.Id);
        System.assertEquals(5, financeLines.size(), 'There should be 5 finance lines');
    }

    @isTest
    static void testCreateWorkLogs_Success() {
        // Fetch the test job record created in the test setup
        sitetracker__Job__c job = [SELECT Id FROM sitetracker__Job__c LIMIT 1];
        // Fetch the assigned resource
        sitetracker__Timesheet_User__c resource = [SELECT Id FROM sitetracker__Timesheet_User__c LIMIT 1];
        // Fetch the related finance lines
        List<sitetracker__Finance__c> finances = [SELECT Id FROM sitetracker__Finance__c WHERE Job__c = :job.Id];
        
        // Create a list of valid work logs
        List<Work_Log__c> workLogs = new List<Work_Log__c>();
        for (Integer i = 0; i < 3; i++) {
            workLogs.add(new Work_Log__c(
                Assigned_Resource__c = resource.Id,
                Work_Date__c = Date.today(),
                Notes_Comments__c = 'Log ' + i,
                Ticket__c = 'Ticket_' + i,
                Starting_Point__c = 'Starting Point ' + i, 
                Ending_Point__c = 'Ending Point ' + i,
                Access_Point__c = 'Access Point ' + i,
                Page__c = 'Page ' + i,
                Finance__c = finances[i].Id,
                Unbillable__c = true,
                Claiming_Source__c = 'ST - Bulk',
                Claimed_QTY__c = 1
            ));
        }
        
        // Call the method and assert no exceptions
        Test.startTest();
        JobBulkCreateWorkLogsController.createWorkLogs(workLogs);
        Test.stopTest();
        
        // Assert the work logs are inserted
        List<Work_Log__c> insertedLogs = [SELECT Id FROM Work_Log__c WHERE Assigned_Resource__c != null];
        System.assertEquals(3, insertedLogs.size(), '3 Work Logs should be inserted');
    }

    /*
    @isTest
    static void testCreateWorkLogs_AssignedResourceException() {
        List<Work_Log__c> workLogs = new List<Work_Log__c>();
        workLogs.add(new Work_Log__c(
            Work_Date__c = Date.today(),
            Notes_Comments__c = 'Log with no Assigned Resource'
        ));
        
        // Expect exception for missing Assigned Resource
        try {
            Test.startTest();
            JobBulkCreateWorkLogsController.createWorkLogs(workLogs);
            Test.stopTest();
            System.assert(false, 'Exception was expected but not thrown');
        } catch (AuraHandledException e) {
            System.assertEquals('Assigned Resource is required', e.getMessage());
        }
    }

    @isTest
    static void testCreateWorkLogs_WorkDateException() {
        List<Work_Log__c> workLogs = new List<Work_Log__c>();
        workLogs.add(new Work_Log__c(
            
            Assigned_Resource__c = assignedResource.Id,
            Work_Date__c = Date.today(),
            Notes_Comments__c = 'Log test exception'
        ));
        
        // Expect exception for missing Work Date
        try {
            Test.startTest();
            JobBulkCreateWorkLogsController.createWorkLogs(workLogs);
            Test.stopTest();
            System.assert(false, 'Exception was expected but not thrown');
        } catch (AuraHandledException e) {
            System.assertEquals('Work Date is required', e.getMessage());
        }
    }
  */

    // @isTest
    // static void testCreateWorkLogs() {

    //     // Create test data
    //     List<Work_Log__c> workLogs = new List<Work_Log__c>();
    //     workLogs.add(new Work_Log__c(
    //         Assigned_Resource__c = 'a0zcX0000000WPrQAM',
    //         Work_Date__c = Date.today(),
    //         Notes_Comments__c = 'Test Notes',
    //         Ticket__c = '12345',
    //         Starting_Point__c = 'Test Starting Point',
    //         Ending_Point__c = 'Test Ending Point',
    //         Access_Point__c = 'Test Access Point',
    //         Page__c = '1',
    //         Finance__c = 'a0LcX0000007Ip2UAE',
    //         Claimed_QTY__c = 10,
    //         Unbillable__c = true,
    //         Claiming_Source__c = 'ST - Bulk'
    //     ));

    //     Test.startTest();
    //     // Call the method to test
    //     JobBulkCreateWorkLogsController.createWorkLogs(workLogs);
    //     Test.stopTest();

    //     // Verify the inserted records
    //     List<Work_Log__c> insertedWorkLogs = [SELECT Id FROM Work_Log__c WHERE Assigned_Resource__c = 'a0zcX0000000WPrQAM'];
    //     System.assertEquals(1, insertedWorkLogs.size(), 'There should be one inserted work log');
    // }


}