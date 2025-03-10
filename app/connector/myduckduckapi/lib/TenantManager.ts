import * as https from "https";
import * as http from "http";
import * as zlib from "zlib";
import csvParser from "csv-parser";

import { setTimeout as delay } from "timers/promises";
import {
  getTenantDB,
  transaction,
  Database,
  DDNJobStatusV1,
} from "@hasura/ndc-duckduckapi";

const LOG_DEBUG = true;

// Configuration constants
const SYNC_INTERVAL = 1000 * 60 * 20;
const ERROR_BACKOFF_INTERVAL = 1000 * 60 * 2;
const ERROR_RETRY_COUNT = 3;

const API_VERSION = "v47.0";
const INITIAL_SYNC_TIME = "2023-01-01T00:00:00Z"; // Default fallback if no local data

// Fields to query. You can customize as desired.
// For picklist fields, simply treat them as strings in DuckDB.
const LEAD_FIELDS = [
  "Id",
  "Salutation",
  "FirstName",
  "LastName",
  "Name",
  "Title",
  "Company",
  "Street",
  "City",
  "State",
  "PostalCode",
  "Country",
  "Phone",
  "Email",
  "Website",
  "LeadSource",
  "Status",
  "Industry",
  "NumberOfEmployees",
  "AnnualRevenue",
  "Rating",
  "IsConverted",
  "ConvertedDate",
  "ConvertedAccountId",
  "ConvertedContactId",
  "ConvertedOpportunityId",
  "IsDeleted",
  "CreatedDate",
  "CreatedById",
  "LastModifiedDate",
  "LastModifiedById",
  "SystemModstamp",
].join(", ");

// Add ACCOUNT_FIELDS constant near other field definitions
const ACCOUNT_FIELDS = [
  "Id",
  "AccountSource",
  "AnnualRevenue",
  "BillingCity",
  "BillingCountry",
  "BillingGeocodeAccuracy",
  "BillingLatitude",
  "BillingLongitude",
  "BillingPostalCode",
  "BillingState",
  "BillingStreet",
  "CreatedById",
  "CreatedDate",
  "Description",
  "Fax",
  "Industry",
  "IsDeleted",
  "Jigsaw",
  "JigsawCompanyId",
  "LastActivityDate",
  "LastModifiedById",
  "LastModifiedDate",
  "LastReferencedDate",
  "LastViewedDate",
  "MasterRecordId",
  "Name",
  "NumberOfEmployees",
  "OwnerId",
  "ParentId",
  "Phone",
  "PhotoUrl",
  "ShippingCity",
  "ShippingCountry",
  "ShippingGeocodeAccuracy",
  "ShippingLatitude",
  "ShippingLongitude",
  "ShippingPostalCode",
  "ShippingState",
  "ShippingStreet",
  "SicDesc",
  "SystemModstamp",
  "Type",
  "Website",
].join(", ");

// Add CAMPAIGN_FIELDS constant near other field definitions
const CAMPAIGN_FIELDS = [
  "Id",
  "ActualCost",
  "AmountAllOpportunities",
  "AmountWonOpportunities",
  "BudgetedCost",
  "CampaignMemberRecordTypeId",
  "CreatedById",
  "CreatedDate",
  "Description",
  "EndDate",
  "ExpectedResponse",
  "ExpectedRevenue",
  "IsActive",
  "IsDeleted",
  "LastActivityDate",
  "LastModifiedById",
  "LastModifiedDate",
  "LastReferencedDate",
  "LastViewedDate",
  "Name",
  "NumberOfContacts",
  "NumberOfConvertedLeads",
  "NumberOfLeads",
  "NumberOfOpportunities",
  "NumberOfResponses",
  "NumberOfWonOpportunities",
  "NumberSent",
  "OwnerId",
  "ParentId",
  "StartDate",
  "Status",
  "SystemModstamp",
  "Type",
].join(", ");

// Add CAMPAIGN_MEMBER_FIELDS constant near other field definitions
const CAMPAIGN_MEMBER_FIELDS = [
  "Id",
  "CampaignId",
  "City",
  "CompanyOrAccount",
  "ContactId",
  "Country",
  "CreatedById",
  "CreatedDate",
  "Description",
  "DoNotCall",
  "Email",
  "Fax",
  "FirstName",
  "FirstRespondedDate",
  "HasOptedOutOfEmail",
  "HasOptedOutOfFax",
  "HasResponded",
  "IsDeleted",
  "LastModifiedById",
  "LastModifiedDate",
  "LastName",
  "LeadId",
  "LeadOrContactId",
  "LeadOrContactOwnerId",
  "LeadSource",
  "MobilePhone",
  "Name",
  "Phone",
  "PostalCode",
  "Salutation",
  "State",
  "Status",
  "Street",
  "SystemModstamp",
  "Title",
  "Type",
].join(", ");

// Add CONTACT_FIELDS constant near other field definitions
const CONTACT_FIELDS = [
  "Id",
  "AccountId",
  "AssistantName",
  "AssistantPhone",
  "Birthdate",
  "CreatedById",
  "CreatedDate",
  "Department",
  "Description",
  "Email",
  "EmailBouncedDate",
  "EmailBouncedReason",
  "Fax",
  "FirstName",
  "HomePhone",
  "IndividualId",
  "IsDeleted",
  "IsEmailBounced",
  "Jigsaw",
  "JigsawContactId",
  "LastActivityDate",
  "LastCURequestDate",
  "LastCUUpdateDate",
  "LastModifiedById",
  "LastModifiedDate",
  "LastName",
  "LastReferencedDate",
  "LastViewedDate",
  "LeadSource",
  "MailingCity",
  "MailingCountry",
  "MailingGeocodeAccuracy",
  "MailingLatitude",
  "MailingLongitude",
  "MailingPostalCode",
  "MailingState",
  "MailingStreet",
  "MasterRecordId",
  "MobilePhone",
  "Name",
  "OtherCity",
  "OtherCountry",
  "OtherGeocodeAccuracy",
  "OtherLatitude",
  "OtherLongitude",
  "OtherPhone",
  "OtherPostalCode",
  "OtherState",
  "OtherStreet",
  "OwnerId",
  "Phone",
  "PhotoUrl",
  "ReportsToId",
  "Salutation",
  "SystemModstamp",
  "Title",
].join(", ");

// Add CONTRACT_FIELDS constant near other field definitions
const CONTRACT_FIELDS = [
  "Id",
  "AccountId",
  "ActivatedById",
  "ActivatedDate",
  "BillingCity",
  "BillingCountry",
  "BillingGeocodeAccuracy",
  "BillingLatitude",
  "BillingLongitude",
  "BillingPostalCode",
  "BillingState",
  "BillingStreet",
  "CompanySignedDate",
  "CompanySignedId",
  "ContractNumber",
  "ContractTerm",
  "CreatedById",
  "CreatedDate",
  "CustomerSignedDate",
  "CustomerSignedId",
  "CustomerSignedTitle",
  "Description",
  "EndDate",
  "IsDeleted",
  "LastActivityDate",
  "LastApprovedDate",
  "LastModifiedById",
  "LastModifiedDate",
  "LastReferencedDate",
  "LastViewedDate",
  "OwnerExpirationNotice",
  "OwnerId",
  "SpecialTerms",
  "StartDate",
  "Status",
  "StatusCode",
  "SystemModstamp",
].join(", ");

// Add EVENT_FIELDS constant near other field definitions
const EVENT_FIELDS = [
  "Id",
  "AccountId",
  "ActivityDate",
  "ActivityDateTime",
  "CreatedById",
  "CreatedDate",
  "Description",
  "DurationInMinutes",
  "EndDate",
  "EndDateTime",
  "EventSubtype",
  "GroupEventType",
  "IsAllDayEvent",
  "IsArchived",
  "IsChild",
  "IsDeleted",
  "IsGroupEvent",
  "IsPrivate",
  "IsRecurrence",
  "IsRecurrence2",
  "IsRecurrence2Exception",
  "IsRecurrence2Exclusion",
  "IsReminderSet",
  "LastModifiedById",
  "LastModifiedDate",
  "Location",
  "OwnerId",
  "Recurrence2PatternStartDate",
  "Recurrence2PatternText",
  "Recurrence2PatternTimeZone",
  "Recurrence2PatternVersion",
  "RecurrenceActivityId",
  "RecurrenceDayOfMonth",
  "RecurrenceDayOfWeekMask",
  "RecurrenceEndDateOnly",
  "RecurrenceInstance",
  "RecurrenceInterval",
  "RecurrenceMonthOfYear",
  "RecurrenceStartDateTime",
  "RecurrenceTimeZoneSidKey",
  "RecurrenceType",
  "ReminderDateTime",
  "ShowAs",
  "StartDateTime",
  "Subject",
  "SystemModstamp",
  "WhatId",
  "WhoId",
].join(", ");

// Add OPPORTUNITY_FIELDS constant near other field definitions
const OPPORTUNITY_FIELDS = [
  "Id",
  "AccountId",
  "Amount",
  "CloseDate",
  "ContactId",
  "CreatedById",
  "CreatedDate",
  "Description",
  "Fiscal",
  "FiscalQuarter",
  "FiscalYear",
  "ForecastCategory",
  "ForecastCategoryName",
  "HasOpenActivity",
  "HasOpportunityLineItem",
  "HasOverdueTask",
  "IsClosed",
  "IsDeleted",
  "IsWon",
  "LastActivityDate",
  "LastModifiedById",
  "LastModifiedDate",
  "LastReferencedDate",
  "LastViewedDate",
  "LeadSource",
  "Name",
  "NextStep",
  "OwnerId",
  "Pricebook2Id",
  "Probability",
  "StageName",
  "SystemModstamp",
  "Type",
].join(", ");

// Add OPPORTUNITY_CONTACT_ROLE_FIELDS constant near other field definitions
const OPPORTUNITY_CONTACT_ROLE_FIELDS = [
  "Id",
  "ContactId",
  "CreatedById",
  "CreatedDate",
  "IsDeleted",
  "IsPrimary",
  "LastModifiedById",
  "LastModifiedDate",
  "OpportunityId",
  "Role",
  "SystemModstamp",
].join(", ");

// Add OPPORTUNITY_LINE_ITEM_FIELDS constant near other field definitions
const OPPORTUNITY_LINE_ITEM_FIELDS = [
  "Id",
  "CreatedById",
  "CreatedDate",
  "Description",
  "IsDeleted",
  "LastModifiedById",
  "LastModifiedDate",
  "ListPrice",
  "Name",
  "OpportunityId",
  "PricebookEntryId",
  "Product2Id",
  "ProductCode",
  "Quantity",
  "ServiceDate",
  "SortOrder",
  "SystemModstamp",
  "TotalPrice",
  "UnitPrice",
].join(", ");

// Add PRODUCT2_FIELDS constant near other field definitions
const PRODUCT2_FIELDS = [
  "Id",
  "CreatedById",
  "CreatedDate",
  "Description",
  "DisplayUrl",
  "ExternalDataSourceId",
  "ExternalId",
  "Family",
  "IsActive",
  "IsArchived",
  "IsDeleted",
  "LastModifiedById",
  "LastModifiedDate",
  "LastReferencedDate",
  "LastViewedDate",
  "Name",
  "ProductCode",
  "QuantityUnitOfMeasure",
  "StockKeepingUnit",
  "SystemModstamp",
].join(", ");

// Add TASK_FIELDS constant near other field definitions
const TASK_FIELDS = [
  "Id",
  "AccountId",
  "ActivityDate",
  "CallDurationInSeconds",
  "CallObject",
  "CallType",
  "CompletedDateTime",
  "CreatedById",
  "CreatedDate",
  "Description",
  "IsArchived",
  "IsClosed",
  "IsDeleted",
  "IsHighPriority",
  "IsRecurrence",
  "IsReminderSet",
  "LastModifiedById",
  "LastModifiedDate",
  "OwnerId",
  "Priority",
  "RecurrenceActivityId",
  "RecurrenceDayOfMonth",
  "RecurrenceDayOfWeekMask",
  "RecurrenceEndDateOnly",
  "RecurrenceInstance",
  "RecurrenceInterval",
  "RecurrenceMonthOfYear",
  "RecurrenceRegeneratedType",
  "RecurrenceStartDateOnly",
  "RecurrenceTimeZoneSidKey",
  "RecurrenceType",
  "ReminderDateTime",
  "Status",
  "Subject",
  "SystemModstamp",
  "TaskSubtype",
  "WhatId",
  "WhoId",
].join(", ");

// Add USER_FIELDS constant near other field definitions
const USER_FIELDS = [
  "Id",
  "AboutMe",
  "AccountId",
  "Alias",
  "BadgeText",
  "BannerPhotoUrl",
  "CallCenterId",
  "City",
  "CommunityNickname",
  "CompanyName",
  "ContactId",
  "Country",
  "CreatedById",
  "CreatedDate",
  "DefaultGroupNotificationFrequency",
  "DelegatedApproverId",
  "Department",
  "DigestFrequency",
  "Division",
  "Email",
  "EmailEncodingKey",
  "EmployeeNumber",
  "Extension",
  "Fax",
  "FirstName",
  "ForecastEnabled",
  "FullPhotoUrl",
  "GeocodeAccuracy",
  "IsActive",
  "IsExtIndicatorVisible",
  "IsProfilePhotoActive",
  "LanguageLocaleKey",
  "LastLoginDate",
  "LastModifiedById",
  "LastModifiedDate",
  "LastName",
  "LastReferencedDate",
  "LastViewedDate",
  "Latitude",
  "LocaleSidKey",
  "Longitude",
  "ManagerId",
  "MediumBannerPhotoUrl",
  "MediumPhotoUrl",
  "MobilePhone",
  "Name",
  "Phone",
  "PostalCode",
  "ProfileId",
  "ReceivesAdminInfoEmails",
  "ReceivesInfoEmails",
  "SmallBannerPhotoUrl",
  "SmallPhotoUrl",
  "State",
  "Street",
  "SystemModstamp",
  "TimeZoneSidKey",
  "Title",
  "Username",
  "UserPermissionsMarketingUser",
  "UserPermissionsOfflineUser",
  "UserType",
].join(", ");

enum SyncState {
  Running,
  Interrupted,
  Stopped,
}

class SyncInterruptedError extends Error {
  constructor() {
    super("Sync interrupted");
    this.name = "SyncInterruptedError";
  }
}

export class TenantManager {
  db!: Database;
  tenantToken: string | undefined;
  serviceUserId: string | undefined;
  baseUrl: string | undefined;

  status: DDNJobStatusV1 = {
    ok: false,
    message: "Login to connect to Salesforce",
  };

  syncState = SyncState.Stopped;

  constructor(public tenantId: string) {}

  async initDb() {
    this.db ||= await getTenantDB(this.tenantId);
  }

  async setUserConfig(tokenData: Record<string, string>) {
    const { access_token, instance_url, id } = tokenData;

    await this.initDb();

    await transaction(this.db, async (conn) => {
      await conn.run(
        `INSERT INTO ddn_tenant_state (key, value)
         VALUES ('accessToken', ?)
         ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
        access_token
      );

      await conn.run(
        `INSERT INTO ddn_tenant_state (key, value)
         VALUES ('serviceUserId', ?)
         ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
        id
      );

      await conn.run(
        `INSERT INTO ddn_tenant_state (key, value)
         VALUES ('baseUrl', ?)
         ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
        getHostname(instance_url)
      );
    });
  }

  async readTenantState() {
    let reset = false;

    let tenantToken: string | undefined;
    let serviceUserId: string | undefined;
    let baseUrl: string | undefined;

    await this.initDb();

    {
      const rows = await this.db.all(
        `SELECT value FROM ddn_tenant_state WHERE key = 'accessToken'`
      );

      if (rows[0].value) {
        tenantToken = rows[0].value;
      }
    }

    {
      const rows = await this.db.all(
        `SELECT value FROM ddn_tenant_state WHERE key = 'serviceUserId'`
      );

      if (rows[0].value) {
        serviceUserId = rows[0].value;
      }
    }

    {
      const rows = await this.db.all(
        `SELECT value FROM ddn_tenant_state WHERE key = 'baseUrl'`
      );

      if (rows[0].value) {
        baseUrl = rows[0].value;
      }
    }

    if (this.serviceUserId && this.serviceUserId !== serviceUserId) {
      reset = true;
    }

    if (this.baseUrl && this.baseUrl !== baseUrl) {
      reset = true;
    }

    if (tenantToken) this.tenantToken = tenantToken;
    if (serviceUserId) this.serviceUserId = serviceUserId;
    if (baseUrl) this.baseUrl = baseUrl;

    if (reset) {
      await this.stopSync();
      await this.resetAllData();
    }
  }

  async run() {
    await this.readTenantState();

    if (this.syncState !== SyncState.Stopped) return;
    this.syncState = SyncState.Running;

    this.log("Starting sync loop");
    this.status = {
      ok: true,
      message: "Running",
    };

    try {
      // Continuous sync loop
      while (this.syncState === SyncState.Running) {
        await this.syncLead();
        await this.syncAccount();
        await this.syncCampaign();
        await this.syncCampaignMember();
        await this.syncContact();
        await this.syncContract();
        await this.syncEvent();
        await this.syncOpportunity();
        await this.syncOpportunityContactRole();
        await this.syncOpportunityLineItem();
        await this.syncProduct2();
        await this.syncTask();
        await this.syncUser();

        this.log(
          `Completed sync. Waiting for ${
            SYNC_INTERVAL / 1000
          } seconds before next sync...`
        );

        const DELAY_INTERVAL = 5000; // 5 seconds
        for (let i = 0; i < Math.floor(SYNC_INTERVAL / DELAY_INTERVAL); i++) {
          this.assertRunning();
          await delay(DELAY_INTERVAL);
        }
      }
    } catch (e) {
      this.log("Error in sync loop", e);
      this.status = {
        ok: false,
        message: e instanceof Error ? e.message : "Unknown error",
      };
    } finally {
      this.syncState = SyncState.Stopped;
    }
  }

  async stopSync() {
    while (this.syncState !== SyncState.Stopped) {
      this.syncState = SyncState.Interrupted;
      this.status = {
        ok: false,
        message: "Restarting sync...",
      };
      await delay(1000);
    }
  }

  assertRunning() {
    if (this.syncState !== SyncState.Running) {
      throw new SyncInterruptedError();
    }
  }

  /**
   * Upsert or delete a batch of Lead rows in DuckDB.
   */
  async processLeadBatch(rows: any[]): Promise<void> {
    // We'll do everything inside a transaction for consistency.
    await transaction(this.db, async (conn) => {
      for (const row of rows) {
        const isDeleted = row.IsDeleted?.toLowerCase?.() === "true";
        // If the row is deleted, remove it locally
        if (isDeleted) {
          await conn.run(`DELETE FROM Lead WHERE Id = ?`, row.Id);
          continue;
        }

        // Otherwise, upsert.
        // Adjust column list as needed, ensuring they match your `LEAD_FIELDS` and schema.
        // For convenience, cast boolean/time fields as needed.
        await conn.run(
          `
          INSERT INTO Lead (
            Id, 
            Salutation, 
            FirstName, 
            LastName,
            Name,
            Title,
            Company,
            Street,
            City,
            State,
            PostalCode,
            Country,
            Phone,
            Email,
            Website,
            LeadSource,
            Status,
            Industry,
            NumberOfEmployees,
            AnnualRevenue,
            Rating,
            IsConverted,
            ConvertedDate,
            ConvertedAccountId,
            ConvertedContactId,
            ConvertedOpportunityId,
            IsDeleted,
            CreatedDate,
            CreatedById,
            LastModifiedDate,
            LastModifiedById,
            SystemModstamp
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT (Id) DO UPDATE SET
            Salutation=excluded.Salutation,
            FirstName=excluded.FirstName,
            LastName=excluded.LastName,
            Name=excluded.Name,
            Title=excluded.Title,
            Company=excluded.Company,
            Street=excluded.Street,
            City=excluded.City,
            State=excluded.State,
            PostalCode=excluded.PostalCode,
            Country=excluded.Country,
            Phone=excluded.Phone,
            Email=excluded.Email,
            Website=excluded.Website,
            LeadSource=excluded.LeadSource,
            Status=excluded.Status,
            Industry=excluded.Industry,
            NumberOfEmployees=excluded.NumberOfEmployees,
            AnnualRevenue=excluded.AnnualRevenue,
            Rating=excluded.Rating,
            IsConverted=excluded.IsConverted,
            ConvertedDate=excluded.ConvertedDate,
            ConvertedAccountId=excluded.ConvertedAccountId,
            ConvertedContactId=excluded.ConvertedContactId,
            ConvertedOpportunityId=excluded.ConvertedOpportunityId,
            IsDeleted=excluded.IsDeleted,
            CreatedDate=excluded.CreatedDate,
            CreatedById=excluded.CreatedById,
            LastModifiedDate=excluded.LastModifiedDate,
            LastModifiedById=excluded.LastModifiedById,
            SystemModstamp=excluded.SystemModstamp
        `,
          row.Id,
          row.Salutation,
          row.FirstName,
          row.LastName,
          row.Name,
          row.Title,
          row.Company,
          row.Street,
          row.City,
          row.State,
          row.PostalCode,
          row.Country,
          row.Phone,
          row.Email,
          row.Website,
          row.LeadSource,
          row.Status,
          row.Industry,
          parseFieldInt(row.NumberOfEmployees),
          parseFieldFloat(row.AnnualRevenue),
          row.Rating,
          row.IsConverted?.toLowerCase?.() === "true",
          toDuckdbTimestamp(row.ConvertedDate),
          row.ConvertedAccountId,
          row.ConvertedContactId,
          row.ConvertedOpportunityId,
          row.IsDeleted?.toLowerCase?.() === "true",
          toDuckdbTimestamp(row.CreatedDate),
          row.CreatedById,
          toDuckdbTimestamp(row.LastModifiedDate),
          row.LastModifiedById,
          toDuckdbTimestamp(row.SystemModstamp)
        );
      }
    });
  }

  ////////////////////////////////////////////////////////////////////////////////
  // 6. syncLead
  //    Orchestrates incremental Lead synchronization.
  ////////////////////////////////////////////////////////////////////////////////

  async syncLead(): Promise<void> {
    // Find the most recent SystemModstamp we have
    // Note: If no rows, fallback to INITIAL_SYNC_TIME
    const lastModResult = await this.db.all(`
    SELECT MAX(SystemModstamp) as lastMod
      FROM Lead
  `);
    let lastMod = lastModResult?.[0]?.lastMod || INITIAL_SYNC_TIME;

    const lastModDate = new Date(lastMod);
    const lastModMinus = new Date(lastModDate.getTime() - 1 * 60 * 60 * 1000);

    // Build the SOQL. We need to ensure we filter by SystemModstamp >= X
    // Bulk API "queryAll" so we can see merges/deletes, etc.
    const soql = `
    SELECT ${LEAD_FIELDS}
    FROM Lead
    WHERE SystemModstamp >= ${formatDateForSoql(lastModMinus)}
  `;

    // Use fetchBulkApi to run the job & process the results
    // with our processLeadBatch function.
    await this.fetchBulkApi(soql, this.processLeadBatch.bind(this));

    this.log("Lead sync complete.");
  }

  async processResponse(
    res: http.IncomingMessage,
    processBatch: (rows: any[]) => Promise<void>,
    batchSize: number = 50000
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (res.statusCode !== 200) {
        // Consume response to free up memory
        res.resume();
        return reject(
          new Error(
            `Salesforce Bulk API query failed: statusCode=${res.statusCode}`
          )
        );
      }

      const encoding = res.headers["content-encoding"];
      let stream: NodeJS.ReadableStream = res;

      if (encoding === "gzip") {
        stream = res.pipe(zlib.createGunzip());
      }

      let batch: any[] = [];

      stream
        .pipe(csvParser())
        .on("data", async (row: any) => {
          batch.push(row);
          if (batch.length >= batchSize) {
            // Temporarily pause the stream to avoid concurrency issues
            stream.pause();
            const toProcess = [...batch];
            batch = [];
            try {
              await processBatch(toProcess);
            } catch (err) {
              reject(err);
              return;
            } finally {
              stream.resume();
            }
          }
        })
        .on("end", async () => {
          // Process any leftover rows
          if (batch.length > 0) {
            try {
              await processBatch(batch);
            } catch (err) {
              reject(err);
              return;
            }
          }
          resolve();
        })
        .on("error", (err: Error) => {
          reject(err);
        });
    });
  }

  /**
   * Creates a Bulk API queryAll job, waits for completion, and retrieves *all* result sets.
   * @param soql The SOQL query to execute (use operation="queryAll" for including deleted).
   * @param processBatch A function to process an array of parsed CSV rows at a time.
   */
  async fetchBulkApi(
    soql: string,
    processBatch: (rows: any[]) => Promise<void>
  ): Promise<void> {
    // 4.1. Create the Bulk API job
    this.assertRunning();
    const createJobResponse = await this.createBulkQueryJob(soql);
    const jobId = createJobResponse.id;

    // 4.2. Poll until job is completed or failed
    let state = await this.pollJob(jobId);
    if (state !== "JobComplete") {
      throw new Error(
        `Job did not complete successfully. Final state: ${state}`
      );
    }

    // 4.3. Fetch results in pages using locator until there is no more data
    let locator: string | null = null;
    do {
      this.assertRunning();
      const { stream, newLocator } = await this.getQueryResultsStream(
        jobId,
        locator
      );
      // Process CSV data in streaming fashion
      await this.processResponse(stream, processBatch);
      locator = newLocator;
    } while (locator && locator !== "null");
  }

  /**
   * Create a Bulk API queryAll job.
   */
  async createBulkQueryJob(soql: string): Promise<{
    id: string;
    state: string;
  }> {
    const postData = JSON.stringify({
      operation: "queryAll", // or 'query' if you don't need deleted records
      query: soql,
    });

    const options: https.RequestOptions = {
      method: "POST",
      hostname: this.baseUrl,
      path: `/services/data/${API_VERSION}/jobs/query`,
      headers: {
        Authorization: `Bearer ${this.tenantToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode !== 200) {
            return reject(
              new Error(
                `Create job failed. statusCode=${res.statusCode}, body=${data}`
              )
            );
          }
          try {
            const json = JSON.parse(data);
            resolve({ id: json.id, state: json.state });
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on("error", (e) => reject(e));
      req.write(postData);
      req.end();
    });
  }

  /**
   * Poll job state until completed or failed.
   */
  async pollJob(jobId: string): Promise<string> {
    // In real code, you might add a timeout or a maximum number of polls
    let state = "";
    while (!["JobComplete", "Failed", "Aborted"].includes(state)) {
      await delay(2000); // poll interval
      const status = await this.getJobInfo(jobId);
      state = status.state;
    }
    return state;
  }

  /**
   * GET info about the job.
   * Returns the entire JSON including `state` and other properties.
   */
  async getJobInfo(jobId: string): Promise<any> {
    const options: https.RequestOptions = {
      method: "GET",
      hostname: this.baseUrl,
      path: `/services/data/${API_VERSION}/jobs/query/${jobId}`,
      headers: {
        Authorization: `Bearer ${this.tenantToken}`,
        Accept: "application/json",
      },
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode !== 200) {
            return reject(
              new Error(
                `getJobInfo failed. statusCode=${res.statusCode}, body=${data}`
              )
            );
          }
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch (err) {
            reject(err);
          }
        });
      });

      req.on("error", (e) => reject(e));
      req.end();
    });
  }

  /**
   * Get the query results CSV as a stream for a given jobId and locator.
   */
  async getQueryResultsStream(
    jobId: string,
    locator?: string | null
  ): Promise<{ stream: http.IncomingMessage; newLocator: string | null }> {
    const queryParams: string[] = [];
    // Feel free to adjust maxRecords= if you want chunked sets
    queryParams.push(`maxRecords=50000`);
    if (locator) {
      queryParams.push(`locator=${locator}`);
    }
    const fullPath = `/services/data/${API_VERSION}/jobs/query/${jobId}/results${
      queryParams.length ? `?${queryParams.join("&")}` : ""
    }`;

    const options: https.RequestOptions = {
      method: "GET",
      hostname: this.baseUrl,
      path: fullPath,
      headers: {
        Authorization: `Bearer ${this.tenantToken}`,
        // Must match what was specified when creating the job. Usually "text/csv"
        Accept: "text/csv",
        // This header requests gzipped content (Salesforce may or may not send it)
        "Accept-Encoding": "gzip",
      },
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        // We'll get the locator from the Sforce-Locator response header
        const newLocator = res.headers["sforce-locator"] as string | undefined;
        resolve({
          stream: res,
          newLocator: newLocator || null,
        });
      });

      req.on("error", (e) => reject(e));
      req.end();
    });
  }

  /**
   * Truncates all known tables except ddn_tenant_state
   */
  private async resetAllData() {
    await transaction(this.db, async (conn) => {
      await conn.run("DELETE FROM leads");
    });
  }

  log(...args: any[]) {
    console.log(`[${this.tenantId}]`, ...args);
  }

  debug(...args: any[]) {
    if (LOG_DEBUG) this.log(...args);
  }

  /**
   * Fetch with retry logic for rate limits
   */
  private async fetchWithRetry(url: string): Promise<any> {
    if (!this.tenantToken) {
      throw new Error("No tenant token");
    }

    return fetchWithRetry(
      url,
      this.tenantToken,
      this.assertRunning.bind(this),
      this.debug.bind(this)
    );
  }

  async cleanup() {
    try {
      // Stop any ongoing sync
      await this.stopSync();

      // Close the database connection if it exists
      if (this.db) {
        await this.db.close();
        this.db = undefined as any;
      }
    } catch (e) {
      console.error(`Error cleaning up tenant ${this.tenantId}:`, e);
    }
  }

  // Add syncAccount method
  async syncAccount(): Promise<void> {
    // Find the most recent SystemModstamp we have
    const lastModResult = await this.db.all(`
      SELECT MAX(SystemModstamp) as lastMod
      FROM Account
    `);
    let lastMod = lastModResult?.[0]?.lastMod || INITIAL_SYNC_TIME;

    const lastModDate = new Date(lastMod);
    const lastModMinus = new Date(lastModDate.getTime() - 1 * 60 * 60 * 1000);

    // Build the SOQL query
    const soql = `
      SELECT ${ACCOUNT_FIELDS}
      FROM Account
      WHERE SystemModstamp >= ${formatDateForSoql(lastModMinus)}
    `;

    // Use fetchBulkApi to run the job & process the results
    await this.fetchBulkApi(soql, this.processAccountBatch.bind(this));

    this.log("Account sync complete.");
  }

  // Add processAccountBatch method
  async processAccountBatch(rows: any[]): Promise<void> {
    await transaction(this.db, async (conn) => {
      for (const row of rows) {
        const isDeleted = row.IsDeleted?.toLowerCase?.() === "true";

        if (isDeleted) {
          await conn.run(`DELETE FROM Account WHERE Id = ?`, row.Id);
          continue;
        }

        await conn.run(
          `
          INSERT INTO Account (
            Id,
            AccountSource,
            AnnualRevenue,
            BillingCity,
            BillingCountry,
            BillingGeocodeAccuracy,
            BillingLatitude,
            BillingLongitude,
            BillingPostalCode,
            BillingState,
            BillingStreet,
            CreatedById,
            CreatedDate,
            Description,
            Fax,
            Industry,
            IsDeleted,
            Jigsaw,
            JigsawCompanyId,
            LastActivityDate,
            LastModifiedById,
            LastModifiedDate,
            LastReferencedDate,
            LastViewedDate,
            MasterRecordId,
            Name,
            NumberOfEmployees,
            OwnerId,
            ParentId,
            Phone,
            PhotoUrl,
            ShippingCity,
            ShippingCountry,
            ShippingGeocodeAccuracy,
            ShippingLatitude,
            ShippingLongitude,
            ShippingPostalCode,
            ShippingState,
            ShippingStreet,
            SicDesc,
            SystemModstamp,
            Type,
            Website
          )
          VALUES (${Array(44).fill("?").join(",")})
          ON CONFLICT (Id) DO UPDATE SET
            AccountSource=excluded.AccountSource,
            AnnualRevenue=excluded.AnnualRevenue,
            BillingCity=excluded.BillingCity,
            BillingCountry=excluded.BillingCountry,
            BillingGeocodeAccuracy=excluded.BillingGeocodeAccuracy,
            BillingLatitude=excluded.BillingLatitude,
            BillingLongitude=excluded.BillingLongitude,
            BillingPostalCode=excluded.BillingPostalCode,
            BillingState=excluded.BillingState,
            BillingStreet=excluded.BillingStreet,
            CreatedById=excluded.CreatedById,
            CreatedDate=excluded.CreatedDate,
            Description=excluded.Description,
            Fax=excluded.Fax,
            Industry=excluded.Industry,
            IsDeleted=excluded.IsDeleted,
            Jigsaw=excluded.Jigsaw,
            JigsawCompanyId=excluded.JigsawCompanyId,
            LastActivityDate=excluded.LastActivityDate,
            LastModifiedById=excluded.LastModifiedById,
            LastModifiedDate=excluded.LastModifiedDate,
            LastReferencedDate=excluded.LastReferencedDate,
            LastViewedDate=excluded.LastViewedDate,
            MasterRecordId=excluded.MasterRecordId,
            Name=excluded.Name,
            NumberOfEmployees=excluded.NumberOfEmployees,
            OwnerId=excluded.OwnerId,
            ParentId=excluded.ParentId,
            Phone=excluded.Phone,
            PhotoUrl=excluded.PhotoUrl,
            ShippingCity=excluded.ShippingCity,
            ShippingCountry=excluded.ShippingCountry,
            ShippingGeocodeAccuracy=excluded.ShippingGeocodeAccuracy,
            ShippingLatitude=excluded.ShippingLatitude,
            ShippingLongitude=excluded.ShippingLongitude,
            ShippingPostalCode=excluded.ShippingPostalCode,
            ShippingState=excluded.ShippingState,
            ShippingStreet=excluded.ShippingStreet,
            SicDesc=excluded.SicDesc,
            SystemModstamp=excluded.SystemModstamp,
            Type=excluded.Type,
            Website=excluded.Website
          `,
          row.Id,
          row.AccountSource,
          parseFieldFloat(row.AnnualRevenue),
          row.BillingCity,
          row.BillingCountry,
          row.BillingGeocodeAccuracy,
          parseFieldFloat(row.BillingLatitude),
          parseFieldFloat(row.BillingLongitude),
          row.BillingPostalCode,
          row.BillingState,
          row.BillingStreet,
          row.CreatedById,
          toDuckdbTimestamp(row.CreatedDate),
          row.Description,
          row.Fax,
          row.Industry,
          row.IsDeleted?.toLowerCase?.() === "true",
          row.Jigsaw,
          row.JigsawCompanyId,
          toDuckdbTimestamp(row.LastActivityDate),
          row.LastModifiedById,
          toDuckdbTimestamp(row.LastModifiedDate),
          toDuckdbTimestamp(row.LastReferencedDate),
          toDuckdbTimestamp(row.LastViewedDate),
          row.MasterRecordId,
          row.Name,
          parseFieldInt(row.NumberOfEmployees),
          row.OwnerId,
          row.ParentId,
          row.Phone,
          row.PhotoUrl,
          row.ShippingCity,
          row.ShippingCountry,
          row.ShippingGeocodeAccuracy,
          parseFieldFloat(row.ShippingLatitude),
          parseFieldFloat(row.ShippingLongitude),
          row.ShippingPostalCode,
          row.ShippingState,
          row.ShippingStreet,
          row.SicDesc,
          toDuckdbTimestamp(row.SystemModstamp),
          row.Type,
          row.Website
        );
      }
    });
  }

  // Add syncCampaign method
  async syncCampaign(): Promise<void> {
    const lastModResult = await this.db.all(`
      SELECT MAX(SystemModstamp) as lastMod
      FROM Campaign
    `);
    let lastMod = lastModResult?.[0]?.lastMod || INITIAL_SYNC_TIME;

    const lastModDate = new Date(lastMod);
    const lastModMinus = new Date(lastModDate.getTime() - 1 * 60 * 60 * 1000);

    const soql = `
      SELECT ${CAMPAIGN_FIELDS}
      FROM Campaign
      WHERE SystemModstamp >= ${formatDateForSoql(lastModMinus)}
    `;

    await this.fetchBulkApi(soql, this.processCampaignBatch.bind(this));

    this.log("Campaign sync complete.");
  }

  // Add processCampaignBatch method
  async processCampaignBatch(rows: any[]): Promise<void> {
    await transaction(this.db, async (conn) => {
      for (const row of rows) {
        const isDeleted = row.IsDeleted?.toLowerCase?.() === "true";

        if (isDeleted) {
          await conn.run(`DELETE FROM Campaign WHERE Id = ?`, row.Id);
          continue;
        }

        await conn.run(
          `
          INSERT INTO Campaign (
            Id,
            ActualCost,
            AmountAllOpportunities,
            AmountWonOpportunities,
            BudgetedCost,
            CampaignMemberRecordTypeId,
            CreatedById,
            CreatedDate,
            Description,
            EndDate,
            ExpectedResponse,
            ExpectedRevenue,
            IsActive,
            IsDeleted,
            LastActivityDate,
            LastModifiedById,
            LastModifiedDate,
            LastReferencedDate,
            LastViewedDate,
            Name,
            NumberOfContacts,
            NumberOfConvertedLeads,
            NumberOfLeads,
            NumberOfOpportunities,
            NumberOfResponses,
            NumberOfWonOpportunities,
            NumberSent,
            OwnerId,
            ParentId,
            StartDate,
            Status,
            SystemModstamp,
            Type
          )
          VALUES (${Array(33).fill("?").join(",")})
          ON CONFLICT (Id) DO UPDATE SET
            ActualCost=excluded.ActualCost,
            AmountAllOpportunities=excluded.AmountAllOpportunities,
            AmountWonOpportunities=excluded.AmountWonOpportunities,
            BudgetedCost=excluded.BudgetedCost,
            CampaignMemberRecordTypeId=excluded.CampaignMemberRecordTypeId,
            CreatedById=excluded.CreatedById,
            CreatedDate=excluded.CreatedDate,
            Description=excluded.Description,
            EndDate=excluded.EndDate,
            ExpectedResponse=excluded.ExpectedResponse,
            ExpectedRevenue=excluded.ExpectedRevenue,
            IsActive=excluded.IsActive,
            IsDeleted=excluded.IsDeleted,
            LastActivityDate=excluded.LastActivityDate,
            LastModifiedById=excluded.LastModifiedById,
            LastModifiedDate=excluded.LastModifiedDate,
            LastReferencedDate=excluded.LastReferencedDate,
            LastViewedDate=excluded.LastViewedDate,
            Name=excluded.Name,
            NumberOfContacts=excluded.NumberOfContacts,
            NumberOfConvertedLeads=excluded.NumberOfConvertedLeads,
            NumberOfLeads=excluded.NumberOfLeads,
            NumberOfOpportunities=excluded.NumberOfOpportunities,
            NumberOfResponses=excluded.NumberOfResponses,
            NumberOfWonOpportunities=excluded.NumberOfWonOpportunities,
            NumberSent=excluded.NumberSent,
            OwnerId=excluded.OwnerId,
            ParentId=excluded.ParentId,
            StartDate=excluded.StartDate,
            Status=excluded.Status,
            SystemModstamp=excluded.SystemModstamp,
            Type=excluded.Type
          `,
          row.Id,
          parseFieldFloat(row.ActualCost),
          parseFieldFloat(row.AmountAllOpportunities),
          parseFieldFloat(row.AmountWonOpportunities),
          parseFieldFloat(row.BudgetedCost),
          row.CampaignMemberRecordTypeId,
          row.CreatedById,
          toDuckdbTimestamp(row.CreatedDate),
          row.Description,
          toDuckdbTimestamp(row.EndDate),
          parseFieldFloat(row.ExpectedResponse),
          parseFieldFloat(row.ExpectedRevenue),
          row.IsActive?.toLowerCase?.() === "true",
          row.IsDeleted?.toLowerCase?.() === "true",
          toDuckdbTimestamp(row.LastActivityDate),
          row.LastModifiedById,
          toDuckdbTimestamp(row.LastModifiedDate),
          toDuckdbTimestamp(row.LastReferencedDate),
          toDuckdbTimestamp(row.LastViewedDate),
          row.Name,
          parseFieldInt(row.NumberOfContacts),
          parseFieldInt(row.NumberOfConvertedLeads),
          parseFieldInt(row.NumberOfLeads),
          parseFieldInt(row.NumberOfOpportunities),
          parseFieldInt(row.NumberOfResponses),
          parseFieldInt(row.NumberOfWonOpportunities),
          parseFieldFloat(row.NumberSent),
          row.OwnerId,
          row.ParentId,
          toDuckdbTimestamp(row.StartDate),
          row.Status,
          toDuckdbTimestamp(row.SystemModstamp),
          row.Type
        );
      }
    });
  }

  // Add syncCampaignMember method
  async syncCampaignMember(): Promise<void> {
    const lastModResult = await this.db.all(`
      SELECT MAX(SystemModstamp) as lastMod
      FROM CampaignMember
    `);
    let lastMod = lastModResult?.[0]?.lastMod || INITIAL_SYNC_TIME;

    const lastModDate = new Date(lastMod);
    const lastModMinus = new Date(lastModDate.getTime() - 1 * 60 * 60 * 1000);

    const soql = `
      SELECT ${CAMPAIGN_MEMBER_FIELDS}
      FROM CampaignMember
      WHERE SystemModstamp >= ${formatDateForSoql(lastModMinus)}
    `;

    await this.fetchBulkApi(soql, this.processCampaignMemberBatch.bind(this));

    this.log("CampaignMember sync complete.");
  }

  // Add processCampaignMemberBatch method
  async processCampaignMemberBatch(rows: any[]): Promise<void> {
    await transaction(this.db, async (conn) => {
      for (const row of rows) {
        const isDeleted = row.IsDeleted?.toLowerCase?.() === "true";

        if (isDeleted) {
          await conn.run(`DELETE FROM CampaignMember WHERE Id = ?`, row.Id);
          continue;
        }

        await conn.run(
          `
          INSERT INTO CampaignMember (
            Id,
            CampaignId,
            City,
            CompanyOrAccount,
            ContactId,
            Country,
            CreatedById,
            CreatedDate,
            Description,
            DoNotCall,
            Email,
            Fax,
            FirstName,
            FirstRespondedDate,
            HasOptedOutOfEmail,
            HasOptedOutOfFax,
            HasResponded,
            IsDeleted,
            LastModifiedById,
            LastModifiedDate,
            LastName,
            LeadId,
            LeadOrContactId,
            LeadOrContactOwnerId,
            LeadSource,
            MobilePhone,
            Name,
            Phone,
            PostalCode,
            Salutation,
            State,
            Status,
            Street,
            SystemModstamp,
            Title,
            Type
          )
          VALUES (${Array(36).fill("?").join(",")})
          ON CONFLICT (Id) DO UPDATE SET
            CampaignId=excluded.CampaignId,
            City=excluded.City,
            CompanyOrAccount=excluded.CompanyOrAccount,
            ContactId=excluded.ContactId,
            Country=excluded.Country,
            CreatedById=excluded.CreatedById,
            CreatedDate=excluded.CreatedDate,
            Description=excluded.Description,
            DoNotCall=excluded.DoNotCall,
            Email=excluded.Email,
            Fax=excluded.Fax,
            FirstName=excluded.FirstName,
            FirstRespondedDate=excluded.FirstRespondedDate,
            HasOptedOutOfEmail=excluded.HasOptedOutOfEmail,
            HasOptedOutOfFax=excluded.HasOptedOutOfFax,
            HasResponded=excluded.HasResponded,
            IsDeleted=excluded.IsDeleted,
            LastModifiedById=excluded.LastModifiedById,
            LastModifiedDate=excluded.LastModifiedDate,
            LastName=excluded.LastName,
            LeadId=excluded.LeadId,
            LeadOrContactId=excluded.LeadOrContactId,
            LeadOrContactOwnerId=excluded.LeadOrContactOwnerId,
            LeadSource=excluded.LeadSource,
            MobilePhone=excluded.MobilePhone,
            Name=excluded.Name,
            Phone=excluded.Phone,
            PostalCode=excluded.PostalCode,
            Salutation=excluded.Salutation,
            State=excluded.State,
            Status=excluded.Status,
            Street=excluded.Street,
            SystemModstamp=excluded.SystemModstamp,
            Title=excluded.Title,
            Type=excluded.Type
          `,
          row.Id,
          row.CampaignId,
          row.City,
          row.CompanyOrAccount,
          row.ContactId,
          row.Country,
          row.CreatedById,
          toDuckdbTimestamp(row.CreatedDate),
          row.Description,
          row.DoNotCall?.toLowerCase?.() === "true",
          row.Email,
          row.Fax,
          row.FirstName,
          toDuckdbTimestamp(row.FirstRespondedDate),
          row.HasOptedOutOfEmail?.toLowerCase?.() === "true",
          row.HasOptedOutOfFax?.toLowerCase?.() === "true",
          row.HasResponded?.toLowerCase?.() === "true",
          row.IsDeleted?.toLowerCase?.() === "true",
          row.LastModifiedById,
          toDuckdbTimestamp(row.LastModifiedDate),
          row.LastName,
          row.LeadId,
          row.LeadOrContactId,
          row.LeadOrContactOwnerId,
          row.LeadSource,
          row.MobilePhone,
          row.Name,
          row.Phone,
          row.PostalCode,
          row.Salutation,
          row.State,
          row.Status,
          row.Street,
          toDuckdbTimestamp(row.SystemModstamp),
          row.Title,
          row.Type
        );
      }
    });
  }

  // Add syncContact method
  async syncContact(): Promise<void> {
    const lastModResult = await this.db.all(`
      SELECT MAX(SystemModstamp) as lastMod
      FROM Contact
    `);
    let lastMod = lastModResult?.[0]?.lastMod || INITIAL_SYNC_TIME;

    const lastModDate = new Date(lastMod);
    const lastModMinus = new Date(lastModDate.getTime() - 1 * 60 * 60 * 1000);

    const soql = `
      SELECT ${CONTACT_FIELDS}
      FROM Contact
      WHERE SystemModstamp >= ${formatDateForSoql(lastModMinus)}
    `;

    await this.fetchBulkApi(soql, this.processContactBatch.bind(this));

    this.log("Contact sync complete.");
  }

  // Add processContactBatch method
  async processContactBatch(rows: any[]): Promise<void> {
    await transaction(this.db, async (conn) => {
      for (const row of rows) {
        const isDeleted = row.IsDeleted?.toLowerCase?.() === "true";

        if (isDeleted) {
          await conn.run(`DELETE FROM Contact WHERE Id = ?`, row.Id);
          continue;
        }

        await conn.run(
          `
          INSERT INTO Contact (
            Id,
            AccountId,
            AssistantName,
            AssistantPhone,
            Birthdate,
            CreatedById,
            CreatedDate,
            Department,
            Description,
            Email,
            EmailBouncedDate,
            EmailBouncedReason,
            Fax,
            FirstName,
            HomePhone,
            IndividualId,
            IsDeleted,
            IsEmailBounced,
            Jigsaw,
            JigsawContactId,
            LastActivityDate,
            LastCURequestDate,
            LastCUUpdateDate,
            LastModifiedById,
            LastModifiedDate,
            LastName,
            LastReferencedDate,
            LastViewedDate,
            LeadSource,
            MailingCity,
            MailingCountry,
            MailingGeocodeAccuracy,
            MailingLatitude,
            MailingLongitude,
            MailingPostalCode,
            MailingState,
            MailingStreet,
            MasterRecordId,
            MobilePhone,
            Name,
            OtherCity,
            OtherCountry,
            OtherGeocodeAccuracy,
            OtherLatitude,
            OtherLongitude,
            OtherPhone,
            OtherPostalCode,
            OtherState,
            OtherStreet,
            OwnerId,
            Phone,
            PhotoUrl,
            ReportsToId,
            Salutation,
            SystemModstamp,
            Title
          )
          VALUES (${Array(56).fill("?").join(",")})
          ON CONFLICT (Id) DO UPDATE SET
            AccountId=excluded.AccountId,
            AssistantName=excluded.AssistantName,
            AssistantPhone=excluded.AssistantPhone,
            Birthdate=excluded.Birthdate,
            CreatedById=excluded.CreatedById,
            CreatedDate=excluded.CreatedDate,
            Department=excluded.Department,
            Description=excluded.Description,
            Email=excluded.Email,
            EmailBouncedDate=excluded.EmailBouncedDate,
            EmailBouncedReason=excluded.EmailBouncedReason,
            Fax=excluded.Fax,
            FirstName=excluded.FirstName,
            HomePhone=excluded.HomePhone,
            IndividualId=excluded.IndividualId,
            IsDeleted=excluded.IsDeleted,
            IsEmailBounced=excluded.IsEmailBounced,
            Jigsaw=excluded.Jigsaw,
            JigsawContactId=excluded.JigsawContactId,
            LastActivityDate=excluded.LastActivityDate,
            LastCURequestDate=excluded.LastCURequestDate,
            LastCUUpdateDate=excluded.LastCUUpdateDate,
            LastModifiedById=excluded.LastModifiedById,
            LastModifiedDate=excluded.LastModifiedDate,
            LastName=excluded.LastName,
            LastReferencedDate=excluded.LastReferencedDate,
            LastViewedDate=excluded.LastViewedDate,
            LeadSource=excluded.LeadSource,
            MailingCity=excluded.MailingCity,
            MailingCountry=excluded.MailingCountry,
            MailingGeocodeAccuracy=excluded.MailingGeocodeAccuracy,
            MailingLatitude=excluded.MailingLatitude,
            MailingLongitude=excluded.MailingLongitude,
            MailingPostalCode=excluded.MailingPostalCode,
            MailingState=excluded.MailingState,
            MailingStreet=excluded.MailingStreet,
            MasterRecordId=excluded.MasterRecordId,
            MobilePhone=excluded.MobilePhone,
            Name=excluded.Name,
            OtherCity=excluded.OtherCity,
            OtherCountry=excluded.OtherCountry,
            OtherGeocodeAccuracy=excluded.OtherGeocodeAccuracy,
            OtherLatitude=excluded.OtherLatitude,
            OtherLongitude=excluded.OtherLongitude,
            OtherPhone=excluded.OtherPhone,
            OtherPostalCode=excluded.OtherPostalCode,
            OtherState=excluded.OtherState,
            OtherStreet=excluded.OtherStreet,
            OwnerId=excluded.OwnerId,
            Phone=excluded.Phone,
            PhotoUrl=excluded.PhotoUrl,
            ReportsToId=excluded.ReportsToId,
            Salutation=excluded.Salutation,
            SystemModstamp=excluded.SystemModstamp,
            Title=excluded.Title
          `,
          row.Id,
          row.AccountId,
          row.AssistantName,
          row.AssistantPhone,
          toDuckdbTimestamp(row.Birthdate),
          row.CreatedById,
          toDuckdbTimestamp(row.CreatedDate),
          row.Department,
          row.Description,
          row.Email,
          toDuckdbTimestamp(row.EmailBouncedDate),
          row.EmailBouncedReason,
          row.Fax,
          row.FirstName,
          row.HomePhone,
          row.IndividualId,
          row.IsDeleted?.toLowerCase?.() === "true",
          row.IsEmailBounced?.toLowerCase?.() === "true",
          row.Jigsaw,
          row.JigsawContactId,
          toDuckdbTimestamp(row.LastActivityDate),
          toDuckdbTimestamp(row.LastCURequestDate),
          toDuckdbTimestamp(row.LastCUUpdateDate),
          row.LastModifiedById,
          toDuckdbTimestamp(row.LastModifiedDate),
          row.LastName,
          toDuckdbTimestamp(row.LastReferencedDate),
          toDuckdbTimestamp(row.LastViewedDate),
          row.LeadSource,
          row.MailingCity,
          row.MailingCountry,
          row.MailingGeocodeAccuracy,
          parseFieldFloat(row.MailingLatitude),
          parseFieldFloat(row.MailingLongitude),
          row.MailingPostalCode,
          row.MailingState,
          row.MailingStreet,
          row.MasterRecordId,
          row.MobilePhone,
          row.Name,
          row.OtherCity,
          row.OtherCountry,
          row.OtherGeocodeAccuracy,
          parseFieldFloat(row.OtherLatitude),
          parseFieldFloat(row.OtherLongitude),
          row.OtherPhone,
          row.OtherPostalCode,
          row.OtherState,
          row.OtherStreet,
          row.OwnerId,
          row.Phone,
          row.PhotoUrl,
          row.ReportsToId,
          row.Salutation,
          toDuckdbTimestamp(row.SystemModstamp),
          row.Title
        );
      }
    });
  }

  // Add syncContract method
  async syncContract(): Promise<void> {
    const lastModResult = await this.db.all(`
      SELECT MAX(SystemModstamp) as lastMod
      FROM Contract
    `);
    let lastMod = lastModResult?.[0]?.lastMod || INITIAL_SYNC_TIME;

    const lastModDate = new Date(lastMod);
    const lastModMinus = new Date(lastModDate.getTime() - 1 * 60 * 60 * 1000);

    const soql = `
      SELECT ${CONTRACT_FIELDS}
      FROM Contract
      WHERE SystemModstamp >= ${formatDateForSoql(lastModMinus)}
    `;

    await this.fetchBulkApi(soql, this.processContractBatch.bind(this));

    this.log("Contract sync complete.");
  }

  // Add processContractBatch method
  async processContractBatch(rows: any[]): Promise<void> {
    await transaction(this.db, async (conn) => {
      for (const row of rows) {
        const isDeleted = row.IsDeleted?.toLowerCase?.() === "true";

        if (isDeleted) {
          await conn.run(`DELETE FROM Contract WHERE Id = ?`, row.Id);
          continue;
        }

        await conn.run(
          `
          INSERT INTO Contract (
            Id,
            AccountId,
            ActivatedById,
            ActivatedDate,
            BillingCity,
            BillingCountry,
            BillingGeocodeAccuracy,
            BillingLatitude,
            BillingLongitude,
            BillingPostalCode,
            BillingState,
            BillingStreet,
            CompanySignedDate,
            CompanySignedId,
            ContractNumber,
            ContractTerm,
            CreatedById,
            CreatedDate,
            CustomerSignedDate,
            CustomerSignedId,
            CustomerSignedTitle,
            Description,
            EndDate,
            IsDeleted,
            LastActivityDate,
            LastApprovedDate,
            LastModifiedById,
            LastModifiedDate,
            LastReferencedDate,
            LastViewedDate,
            OwnerExpirationNotice,
            OwnerId,
            SpecialTerms,
            StartDate,
            Status,
            StatusCode,
            SystemModstamp
          )
          VALUES (${Array(37).fill("?").join(",")})
          ON CONFLICT (Id) DO UPDATE SET
            AccountId=excluded.AccountId,
            ActivatedById=excluded.ActivatedById,
            ActivatedDate=excluded.ActivatedDate,
            BillingCity=excluded.BillingCity,
            BillingCountry=excluded.BillingCountry,
            BillingGeocodeAccuracy=excluded.BillingGeocodeAccuracy,
            BillingLatitude=excluded.BillingLatitude,
            BillingLongitude=excluded.BillingLongitude,
            BillingPostalCode=excluded.BillingPostalCode,
            BillingState=excluded.BillingState,
            BillingStreet=excluded.BillingStreet,
            CompanySignedDate=excluded.CompanySignedDate,
            CompanySignedId=excluded.CompanySignedId,
            ContractNumber=excluded.ContractNumber,
            ContractTerm=excluded.ContractTerm,
            CreatedById=excluded.CreatedById,
            CreatedDate=excluded.CreatedDate,
            CustomerSignedDate=excluded.CustomerSignedDate,
            CustomerSignedId=excluded.CustomerSignedId,
            CustomerSignedTitle=excluded.CustomerSignedTitle,
            Description=excluded.Description,
            EndDate=excluded.EndDate,
            IsDeleted=excluded.IsDeleted,
            LastActivityDate=excluded.LastActivityDate,
            LastApprovedDate=excluded.LastApprovedDate,
            LastModifiedById=excluded.LastModifiedById,
            LastModifiedDate=excluded.LastModifiedDate,
            LastReferencedDate=excluded.LastReferencedDate,
            LastViewedDate=excluded.LastViewedDate,
            OwnerExpirationNotice=excluded.OwnerExpirationNotice,
            OwnerId=excluded.OwnerId,
            SpecialTerms=excluded.SpecialTerms,
            StartDate=excluded.StartDate,
            Status=excluded.Status,
            StatusCode=excluded.StatusCode,
            SystemModstamp=excluded.SystemModstamp
          `,
          row.Id,
          row.AccountId,
          row.ActivatedById,
          toDuckdbTimestamp(row.ActivatedDate),
          row.BillingCity,
          row.BillingCountry,
          row.BillingGeocodeAccuracy,
          parseFieldFloat(row.BillingLatitude),
          parseFieldFloat(row.BillingLongitude),
          row.BillingPostalCode,
          row.BillingState,
          row.BillingStreet,
          toDuckdbTimestamp(row.CompanySignedDate),
          row.CompanySignedId,
          row.ContractNumber,
          parseFieldInt(row.ContractTerm),
          row.CreatedById,
          toDuckdbTimestamp(row.CreatedDate),
          toDuckdbTimestamp(row.CustomerSignedDate),
          row.CustomerSignedId,
          row.CustomerSignedTitle,
          row.Description,
          toDuckdbTimestamp(row.EndDate),
          row.IsDeleted?.toLowerCase?.() === "true",
          toDuckdbTimestamp(row.LastActivityDate),
          toDuckdbTimestamp(row.LastApprovedDate),
          row.LastModifiedById,
          toDuckdbTimestamp(row.LastModifiedDate),
          toDuckdbTimestamp(row.LastReferencedDate),
          toDuckdbTimestamp(row.LastViewedDate),
          row.OwnerExpirationNotice,
          row.OwnerId,
          row.SpecialTerms,
          toDuckdbTimestamp(row.StartDate),
          row.Status,
          row.StatusCode,
          toDuckdbTimestamp(row.SystemModstamp)
        );
      }
    });
  }

  // Add syncEvent method
  async syncEvent(): Promise<void> {
    const lastModResult = await this.db.all(`
      SELECT MAX(SystemModstamp) as lastMod
      FROM Event
    `);
    let lastMod = lastModResult?.[0]?.lastMod || INITIAL_SYNC_TIME;

    const lastModDate = new Date(lastMod);
    const lastModMinus = new Date(lastModDate.getTime() - 1 * 60 * 60 * 1000);

    const soql = `
      SELECT ${EVENT_FIELDS}
      FROM Event
      WHERE SystemModstamp >= ${formatDateForSoql(lastModMinus)}
    `;

    await this.fetchBulkApi(soql, this.processEventBatch.bind(this));

    this.log("Event sync complete.");
  }

  // Add processEventBatch method
  async processEventBatch(rows: any[]): Promise<void> {
    await transaction(this.db, async (conn) => {
      for (const row of rows) {
        const isDeleted = row.IsDeleted?.toLowerCase?.() === "true";

        if (isDeleted) {
          await conn.run(`DELETE FROM Event WHERE Id = ?`, row.Id);
          continue;
        }

        await conn.run(
          `
          INSERT INTO Event (
            Id,
            AccountId,
            ActivityDate,
            ActivityDateTime,
            CreatedById,
            CreatedDate,
            Description,
            DurationInMinutes,
            EndDate,
            EndDateTime,
            EventSubtype,
            GroupEventType,
            IsAllDayEvent,
            IsArchived,
            IsChild,
            IsDeleted,
            IsGroupEvent,
            IsPrivate,
            IsRecurrence,
            IsRecurrence2,
            IsRecurrence2Exception,
            IsRecurrence2Exclusion,
            IsReminderSet,
            LastModifiedById,
            LastModifiedDate,
            Location,
            OwnerId,
            Recurrence2PatternStartDate,
            Recurrence2PatternText,
            Recurrence2PatternTimeZone,
            Recurrence2PatternVersion,
            RecurrenceActivityId,
            RecurrenceDayOfMonth,
            RecurrenceDayOfWeekMask,
            RecurrenceEndDateOnly,
            RecurrenceInstance,
            RecurrenceInterval,
            RecurrenceMonthOfYear,
            RecurrenceStartDateTime,
            RecurrenceTimeZoneSidKey,
            RecurrenceType,
            ReminderDateTime,
            ShowAs,
            StartDateTime,
            Subject,
            SystemModstamp,
            WhatId,
            WhoId
          )
          VALUES (${Array(48).fill("?").join(",")})
          ON CONFLICT (Id) DO UPDATE SET
            AccountId=excluded.AccountId,
            ActivityDate=excluded.ActivityDate,
            ActivityDateTime=excluded.ActivityDateTime,
            CreatedById=excluded.CreatedById,
            CreatedDate=excluded.CreatedDate,
            Description=excluded.Description,
            DurationInMinutes=excluded.DurationInMinutes,
            EndDate=excluded.EndDate,
            EndDateTime=excluded.EndDateTime,
            EventSubtype=excluded.EventSubtype,
            GroupEventType=excluded.GroupEventType,
            IsAllDayEvent=excluded.IsAllDayEvent,
            IsArchived=excluded.IsArchived,
            IsChild=excluded.IsChild,
            IsDeleted=excluded.IsDeleted,
            IsGroupEvent=excluded.IsGroupEvent,
            IsPrivate=excluded.IsPrivate,
            IsRecurrence=excluded.IsRecurrence,
            IsRecurrence2=excluded.IsRecurrence2,
            IsRecurrence2Exception=excluded.IsRecurrence2Exception,
            IsRecurrence2Exclusion=excluded.IsRecurrence2Exclusion,
            IsReminderSet=excluded.IsReminderSet,
            LastModifiedById=excluded.LastModifiedById,
            LastModifiedDate=excluded.LastModifiedDate,
            Location=excluded.Location,
            OwnerId=excluded.OwnerId,
            Recurrence2PatternStartDate=excluded.Recurrence2PatternStartDate,
            Recurrence2PatternText=excluded.Recurrence2PatternText,
            Recurrence2PatternTimeZone=excluded.Recurrence2PatternTimeZone,
            Recurrence2PatternVersion=excluded.Recurrence2PatternVersion,
            RecurrenceActivityId=excluded.RecurrenceActivityId,
            RecurrenceDayOfMonth=excluded.RecurrenceDayOfMonth,
            RecurrenceDayOfWeekMask=excluded.RecurrenceDayOfWeekMask,
            RecurrenceEndDateOnly=excluded.RecurrenceEndDateOnly,
            RecurrenceInstance=excluded.RecurrenceInstance,
            RecurrenceInterval=excluded.RecurrenceInterval,
            RecurrenceMonthOfYear=excluded.RecurrenceMonthOfYear,
            RecurrenceStartDateTime=excluded.RecurrenceStartDateTime,
            RecurrenceTimeZoneSidKey=excluded.RecurrenceTimeZoneSidKey,
            RecurrenceType=excluded.RecurrenceType,
            ReminderDateTime=excluded.ReminderDateTime,
            ShowAs=excluded.ShowAs,
            StartDateTime=excluded.StartDateTime,
            Subject=excluded.Subject,
            SystemModstamp=excluded.SystemModstamp,
            WhatId=excluded.WhatId,
            WhoId=excluded.WhoId
          `,
          row.Id,
          row.AccountId,
          toDuckdbTimestamp(row.ActivityDate),
          toDuckdbTimestamp(row.ActivityDateTime),
          row.CreatedById,
          toDuckdbTimestamp(row.CreatedDate),
          row.Description,
          parseFieldInt(row.DurationInMinutes),
          toDuckdbTimestamp(row.EndDate),
          toDuckdbTimestamp(row.EndDateTime),
          row.EventSubtype,
          row.GroupEventType,
          row.IsAllDayEvent?.toLowerCase?.() === "true",
          row.IsArchived?.toLowerCase?.() === "true",
          row.IsChild?.toLowerCase?.() === "true",
          row.IsDeleted?.toLowerCase?.() === "true",
          row.IsGroupEvent?.toLowerCase?.() === "true",
          row.IsPrivate?.toLowerCase?.() === "true",
          row.IsRecurrence?.toLowerCase?.() === "true",
          row.IsRecurrence2?.toLowerCase?.() === "true",
          row.IsRecurrence2Exception?.toLowerCase?.() === "true",
          row.IsRecurrence2Exclusion?.toLowerCase?.() === "true",
          row.IsReminderSet?.toLowerCase?.() === "true",
          row.LastModifiedById,
          toDuckdbTimestamp(row.LastModifiedDate),
          row.Location,
          row.OwnerId,
          toDuckdbTimestamp(row.Recurrence2PatternStartDate),
          row.Recurrence2PatternText,
          row.Recurrence2PatternTimeZone,
          row.Recurrence2PatternVersion,
          row.RecurrenceActivityId,
          parseFieldInt(row.RecurrenceDayOfMonth),
          parseFieldInt(row.RecurrenceDayOfWeekMask),
          toDuckdbTimestamp(row.RecurrenceEndDateOnly),
          row.RecurrenceInstance,
          parseFieldInt(row.RecurrenceInterval),
          row.RecurrenceMonthOfYear,
          toDuckdbTimestamp(row.RecurrenceStartDateTime),
          row.RecurrenceTimeZoneSidKey,
          row.RecurrenceType,
          toDuckdbTimestamp(row.ReminderDateTime),
          row.ShowAs,
          toDuckdbTimestamp(row.StartDateTime),
          row.Subject,
          toDuckdbTimestamp(row.SystemModstamp),
          row.WhatId,
          row.WhoId
        );
      }
    });
  }

  // Add syncOpportunity method
  async syncOpportunity(): Promise<void> {
    const lastModResult = await this.db.all(`
      SELECT MAX(SystemModstamp) as lastMod
      FROM Opportunity
    `);
    let lastMod = lastModResult?.[0]?.lastMod || INITIAL_SYNC_TIME;

    const lastModDate = new Date(lastMod);
    const lastModMinus = new Date(lastModDate.getTime() - 1 * 60 * 60 * 1000);

    const soql = `
      SELECT ${OPPORTUNITY_FIELDS}
      FROM Opportunity
      WHERE SystemModstamp >= ${formatDateForSoql(lastModMinus)}
    `;

    await this.fetchBulkApi(soql, this.processOpportunityBatch.bind(this));

    this.log("Opportunity sync complete.");
  }

  // Add processOpportunityBatch method
  async processOpportunityBatch(rows: any[]): Promise<void> {
    await transaction(this.db, async (conn) => {
      for (const row of rows) {
        const isDeleted = row.IsDeleted?.toLowerCase?.() === "true";

        if (isDeleted) {
          await conn.run(`DELETE FROM Opportunity WHERE Id = ?`, row.Id);
          continue;
        }

        await conn.run(
          `
          INSERT INTO Opportunity (
            Id,
            AccountId,
            Amount,
            CloseDate,
            ContactId,
            CreatedById,
            CreatedDate,
            Description,
            Fiscal,
            FiscalQuarter,
            FiscalYear,
            ForecastCategory,
            ForecastCategoryName,
            HasOpenActivity,
            HasOpportunityLineItem,
            HasOverdueTask,
            IsClosed,
            IsDeleted,
            IsWon,
            LastActivityDate,
            LastModifiedById,
            LastModifiedDate,
            LastReferencedDate,
            LastViewedDate,
            LeadSource,
            Name,
            NextStep,
            OwnerId,
            Pricebook2Id,
            Probability,
            StageName,
            SystemModstamp,
            Type
          )
          VALUES (${Array(33).fill("?").join(",")})
          ON CONFLICT (Id) DO UPDATE SET
            AccountId=excluded.AccountId,
            Amount=excluded.Amount,
            CloseDate=excluded.CloseDate,
            ContactId=excluded.ContactId,
            CreatedById=excluded.CreatedById,
            CreatedDate=excluded.CreatedDate,
            Description=excluded.Description,
            Fiscal=excluded.Fiscal,
            FiscalQuarter=excluded.FiscalQuarter,
            FiscalYear=excluded.FiscalYear,
            ForecastCategory=excluded.ForecastCategory,
            ForecastCategoryName=excluded.ForecastCategoryName,
            HasOpenActivity=excluded.HasOpenActivity,
            HasOpportunityLineItem=excluded.HasOpportunityLineItem,
            HasOverdueTask=excluded.HasOverdueTask,
            IsClosed=excluded.IsClosed,
            IsDeleted=excluded.IsDeleted,
            IsWon=excluded.IsWon,
            LastActivityDate=excluded.LastActivityDate,
            LastModifiedById=excluded.LastModifiedById,
            LastModifiedDate=excluded.LastModifiedDate,
            LastReferencedDate=excluded.LastReferencedDate,
            LastViewedDate=excluded.LastViewedDate,
            LeadSource=excluded.LeadSource,
            Name=excluded.Name,
            NextStep=excluded.NextStep,
            OwnerId=excluded.OwnerId,
            Pricebook2Id=excluded.Pricebook2Id,
            Probability=excluded.Probability,
            StageName=excluded.StageName,
            SystemModstamp=excluded.SystemModstamp,
            Type=excluded.Type
          `,
          row.Id,
          row.AccountId,
          parseFieldFloat(row.Amount),
          toDuckdbTimestamp(row.CloseDate),
          row.ContactId,
          row.CreatedById,
          toDuckdbTimestamp(row.CreatedDate),
          row.Description,
          row.Fiscal,
          parseFieldInt(row.FiscalQuarter),
          parseFieldInt(row.FiscalYear),
          row.ForecastCategory,
          row.ForecastCategoryName,
          row.HasOpenActivity?.toLowerCase?.() === "true",
          row.HasOpportunityLineItem?.toLowerCase?.() === "true",
          row.HasOverdueTask?.toLowerCase?.() === "true",
          row.IsClosed?.toLowerCase?.() === "true",
          row.IsDeleted?.toLowerCase?.() === "true",
          row.IsWon?.toLowerCase?.() === "true",
          toDuckdbTimestamp(row.LastActivityDate),
          row.LastModifiedById,
          toDuckdbTimestamp(row.LastModifiedDate),
          toDuckdbTimestamp(row.LastReferencedDate),
          toDuckdbTimestamp(row.LastViewedDate),
          row.LeadSource,
          row.Name,
          row.NextStep,
          row.OwnerId,
          row.Pricebook2Id,
          parseFieldFloat(row.Probability),
          row.StageName,
          toDuckdbTimestamp(row.SystemModstamp),
          row.Type
        );
      }
    });
  }

  // Add syncOpportunityContactRole method
  async syncOpportunityContactRole(): Promise<void> {
    const lastModResult = await this.db.all(`
      SELECT MAX(SystemModstamp) as lastMod
      FROM OpportunityContactRole
    `);
    let lastMod = lastModResult?.[0]?.lastMod || INITIAL_SYNC_TIME;

    const lastModDate = new Date(lastMod);
    const lastModMinus = new Date(lastModDate.getTime() - 1 * 60 * 60 * 1000);

    const soql = `
      SELECT ${OPPORTUNITY_CONTACT_ROLE_FIELDS}
      FROM OpportunityContactRole
      WHERE SystemModstamp >= ${formatDateForSoql(lastModMinus)}
    `;

    await this.fetchBulkApi(
      soql,
      this.processOpportunityContactRoleBatch.bind(this)
    );

    this.log("OpportunityContactRole sync complete.");
  }

  // Add processOpportunityContactRoleBatch method
  async processOpportunityContactRoleBatch(rows: any[]): Promise<void> {
    await transaction(this.db, async (conn) => {
      for (const row of rows) {
        const isDeleted = row.IsDeleted?.toLowerCase?.() === "true";

        if (isDeleted) {
          await conn.run(
            `DELETE FROM OpportunityContactRole WHERE Id = ?`,
            row.Id
          );
          continue;
        }

        await conn.run(
          `
          INSERT INTO OpportunityContactRole (
            Id,
            ContactId,
            CreatedById,
            CreatedDate,
            IsDeleted,
            IsPrimary,
            LastModifiedById,
            LastModifiedDate,
            OpportunityId,
            Role,
            SystemModstamp
          )
          VALUES (${Array(11).fill("?").join(",")})
          ON CONFLICT (Id) DO UPDATE SET
            ContactId=excluded.ContactId,
            CreatedById=excluded.CreatedById,
            CreatedDate=excluded.CreatedDate,
            IsDeleted=excluded.IsDeleted,
            IsPrimary=excluded.IsPrimary,
            LastModifiedById=excluded.LastModifiedById,
            LastModifiedDate=excluded.LastModifiedDate,
            OpportunityId=excluded.OpportunityId,
            Role=excluded.Role,
            SystemModstamp=excluded.SystemModstamp
          `,
          row.Id,
          row.ContactId,
          row.CreatedById,
          toDuckdbTimestamp(row.CreatedDate),
          row.IsDeleted?.toLowerCase?.() === "true",
          row.IsPrimary?.toLowerCase?.() === "true",
          row.LastModifiedById,
          toDuckdbTimestamp(row.LastModifiedDate),
          row.OpportunityId,
          row.Role,
          toDuckdbTimestamp(row.SystemModstamp)
        );
      }
    });
  }

  // Add syncOpportunityLineItem method
  async syncOpportunityLineItem(): Promise<void> {
    const lastModResult = await this.db.all(`
      SELECT MAX(SystemModstamp) as lastMod
      FROM OpportunityLineItem
    `);
    let lastMod = lastModResult?.[0]?.lastMod || INITIAL_SYNC_TIME;

    const lastModDate = new Date(lastMod);
    const lastModMinus = new Date(lastModDate.getTime() - 1 * 60 * 60 * 1000);

    const soql = `
      SELECT ${OPPORTUNITY_LINE_ITEM_FIELDS}
      FROM OpportunityLineItem
      WHERE SystemModstamp >= ${formatDateForSoql(lastModMinus)}
    `;

    await this.fetchBulkApi(
      soql,
      this.processOpportunityLineItemBatch.bind(this)
    );

    this.log("OpportunityLineItem sync complete.");
  }

  // Add processOpportunityLineItemBatch method
  async processOpportunityLineItemBatch(rows: any[]): Promise<void> {
    await transaction(this.db, async (conn) => {
      for (const row of rows) {
        const isDeleted = row.IsDeleted?.toLowerCase?.() === "true";

        if (isDeleted) {
          await conn.run(
            `DELETE FROM OpportunityLineItem WHERE Id = ?`,
            row.Id
          );
          continue;
        }

        await conn.run(
          `
          INSERT INTO OpportunityLineItem (
            Id,
            CreatedById,
            CreatedDate,
            Description,
            IsDeleted,
            LastModifiedById,
            LastModifiedDate,
            ListPrice,
            Name,
            OpportunityId,
            PricebookEntryId,
            Product2Id,
            ProductCode,
            Quantity,
            ServiceDate,
            SortOrder,
            SystemModstamp,
            TotalPrice,
            UnitPrice
          )
          VALUES (${Array(19).fill("?").join(",")})
          ON CONFLICT (Id) DO UPDATE SET
            CreatedById=excluded.CreatedById,
            CreatedDate=excluded.CreatedDate,
            Description=excluded.Description,
            IsDeleted=excluded.IsDeleted,
            LastModifiedById=excluded.LastModifiedById,
            LastModifiedDate=excluded.LastModifiedDate,
            ListPrice=excluded.ListPrice,
            Name=excluded.Name,
            OpportunityId=excluded.OpportunityId,
            PricebookEntryId=excluded.PricebookEntryId,
            Product2Id=excluded.Product2Id,
            ProductCode=excluded.ProductCode,
            Quantity=excluded.Quantity,
            ServiceDate=excluded.ServiceDate,
            SortOrder=excluded.SortOrder,
            SystemModstamp=excluded.SystemModstamp,
            TotalPrice=excluded.TotalPrice,
            UnitPrice=excluded.UnitPrice
          `,
          row.Id,
          row.CreatedById,
          toDuckdbTimestamp(row.CreatedDate),
          row.Description,
          row.IsDeleted?.toLowerCase?.() === "true",
          row.LastModifiedById,
          toDuckdbTimestamp(row.LastModifiedDate),
          parseFieldFloat(row.ListPrice),
          row.Name,
          row.OpportunityId,
          row.PricebookEntryId,
          row.Product2Id,
          row.ProductCode,
          parseFieldFloat(row.Quantity),
          toDuckdbTimestamp(row.ServiceDate),
          parseFieldInt(row.SortOrder),
          toDuckdbTimestamp(row.SystemModstamp),
          parseFieldFloat(row.TotalPrice),
          parseFieldFloat(row.UnitPrice)
        );
      }
    });
  }

  // Add syncProduct2 method
  async syncProduct2(): Promise<void> {
    const lastModResult = await this.db.all(`
      SELECT MAX(SystemModstamp) as lastMod
      FROM Product2
    `);
    let lastMod = lastModResult?.[0]?.lastMod || INITIAL_SYNC_TIME;

    const lastModDate = new Date(lastMod);
    const lastModMinus = new Date(lastModDate.getTime() - 1 * 60 * 60 * 1000);

    const soql = `
      SELECT ${PRODUCT2_FIELDS}
      FROM Product2
      WHERE SystemModstamp >= ${formatDateForSoql(lastModMinus)}
    `;

    await this.fetchBulkApi(soql, this.processProduct2Batch.bind(this));

    this.log("Product2 sync complete.");
  }

  // Add processProduct2Batch method
  async processProduct2Batch(rows: any[]): Promise<void> {
    await transaction(this.db, async (conn) => {
      for (const row of rows) {
        const isDeleted = row.IsDeleted?.toLowerCase?.() === "true";

        if (isDeleted) {
          await conn.run(`DELETE FROM Product2 WHERE Id = ?`, row.Id);
          continue;
        }

        await conn.run(
          `
          INSERT INTO Product2 (
            Id,
            CreatedById,
            CreatedDate,
            Description,
            DisplayUrl,
            ExternalDataSourceId,
            ExternalId,
            Family,
            IsActive,
            IsArchived,
            IsDeleted,
            LastModifiedById,
            LastModifiedDate,
            LastReferencedDate,
            LastViewedDate,
            Name,
            ProductCode,
            QuantityUnitOfMeasure,
            StockKeepingUnit,
            SystemModstamp
          )
          VALUES (${Array(20).fill("?").join(",")})
          ON CONFLICT (Id) DO UPDATE SET
            CreatedById=excluded.CreatedById,
            CreatedDate=excluded.CreatedDate,
            Description=excluded.Description,
            DisplayUrl=excluded.DisplayUrl,
            ExternalDataSourceId=excluded.ExternalDataSourceId,
            ExternalId=excluded.ExternalId,
            Family=excluded.Family,
            IsActive=excluded.IsActive,
            IsArchived=excluded.IsArchived,
            IsDeleted=excluded.IsDeleted,
            LastModifiedById=excluded.LastModifiedById,
            LastModifiedDate=excluded.LastModifiedDate,
            LastReferencedDate=excluded.LastReferencedDate,
            LastViewedDate=excluded.LastViewedDate,
            Name=excluded.Name,
            ProductCode=excluded.ProductCode,
            QuantityUnitOfMeasure=excluded.QuantityUnitOfMeasure,
            StockKeepingUnit=excluded.StockKeepingUnit,
            SystemModstamp=excluded.SystemModstamp
          `,
          row.Id,
          row.CreatedById,
          toDuckdbTimestamp(row.CreatedDate),
          row.Description,
          row.DisplayUrl,
          row.ExternalDataSourceId,
          row.ExternalId,
          row.Family,
          row.IsActive?.toLowerCase?.() === "true",
          row.IsArchived?.toLowerCase?.() === "true",
          row.IsDeleted?.toLowerCase?.() === "true",
          row.LastModifiedById,
          toDuckdbTimestamp(row.LastModifiedDate),
          toDuckdbTimestamp(row.LastReferencedDate),
          toDuckdbTimestamp(row.LastViewedDate),
          row.Name,
          row.ProductCode,
          row.QuantityUnitOfMeasure,
          row.StockKeepingUnit,
          toDuckdbTimestamp(row.SystemModstamp)
        );
      }
    });
  }

  // Add syncTask method
  async syncTask(): Promise<void> {
    const lastModResult = await this.db.all(`
      SELECT MAX(SystemModstamp) as lastMod
      FROM Task
    `);
    let lastMod = lastModResult?.[0]?.lastMod || INITIAL_SYNC_TIME;

    const lastModDate = new Date(lastMod);
    const lastModMinus = new Date(lastModDate.getTime() - 1 * 60 * 60 * 1000);

    const soql = `
      SELECT ${TASK_FIELDS}
      FROM Task
      WHERE SystemModstamp >= ${formatDateForSoql(lastModMinus)}
    `;

    await this.fetchBulkApi(soql, this.processTaskBatch.bind(this));

    this.log("Task sync complete.");
  }

  // Add processTaskBatch method
  async processTaskBatch(rows: any[]): Promise<void> {
    await transaction(this.db, async (conn) => {
      for (const row of rows) {
        const isDeleted = row.IsDeleted?.toLowerCase?.() === "true";

        if (isDeleted) {
          await conn.run(`DELETE FROM Task WHERE Id = ?`, row.Id);
          continue;
        }

        await conn.run(
          `
          INSERT INTO Task (
            Id,
            AccountId,
            ActivityDate,
            CallDurationInSeconds,
            CallObject,
            CallType,
            CompletedDateTime,
            CreatedById,
            CreatedDate,
            Description,
            IsArchived,
            IsClosed,
            IsDeleted,
            IsHighPriority,
            IsRecurrence,
            IsReminderSet,
            LastModifiedById,
            LastModifiedDate,
            OwnerId,
            Priority,
            RecurrenceActivityId,
            RecurrenceDayOfMonth,
            RecurrenceDayOfWeekMask,
            RecurrenceEndDateOnly,
            RecurrenceInstance,
            RecurrenceInterval,
            RecurrenceMonthOfYear,
            RecurrenceRegeneratedType,
            RecurrenceStartDateOnly,
            RecurrenceTimeZoneSidKey,
            RecurrenceType,
            ReminderDateTime,
            Status,
            Subject,
            SystemModstamp,
            TaskSubtype,
            WhatId,
            WhoId
          )
          VALUES (${Array(38).fill("?").join(",")})
          ON CONFLICT (Id) DO UPDATE SET
            AccountId=excluded.AccountId,
            ActivityDate=excluded.ActivityDate,
            CallDurationInSeconds=excluded.CallDurationInSeconds,
            CallObject=excluded.CallObject,
            CallType=excluded.CallType,
            CompletedDateTime=excluded.CompletedDateTime,
            CreatedById=excluded.CreatedById,
            CreatedDate=excluded.CreatedDate,
            Description=excluded.Description,
            IsArchived=excluded.IsArchived,
            IsClosed=excluded.IsClosed,
            IsDeleted=excluded.IsDeleted,
            IsHighPriority=excluded.IsHighPriority,
            IsRecurrence=excluded.IsRecurrence,
            IsReminderSet=excluded.IsReminderSet,
            LastModifiedById=excluded.LastModifiedById,
            LastModifiedDate=excluded.LastModifiedDate,
            OwnerId=excluded.OwnerId,
            Priority=excluded.Priority,
            RecurrenceActivityId=excluded.RecurrenceActivityId,
            RecurrenceDayOfMonth=excluded.RecurrenceDayOfMonth,
            RecurrenceDayOfWeekMask=excluded.RecurrenceDayOfWeekMask,
            RecurrenceEndDateOnly=excluded.RecurrenceEndDateOnly,
            RecurrenceInstance=excluded.RecurrenceInstance,
            RecurrenceInterval=excluded.RecurrenceInterval,
            RecurrenceMonthOfYear=excluded.RecurrenceMonthOfYear,
            RecurrenceRegeneratedType=excluded.RecurrenceRegeneratedType,
            RecurrenceStartDateOnly=excluded.RecurrenceStartDateOnly,
            RecurrenceTimeZoneSidKey=excluded.RecurrenceTimeZoneSidKey,
            RecurrenceType=excluded.RecurrenceType,
            ReminderDateTime=excluded.ReminderDateTime,
            Status=excluded.Status,
            Subject=excluded.Subject,
            SystemModstamp=excluded.SystemModstamp,
            TaskSubtype=excluded.TaskSubtype,
            WhatId=excluded.WhatId,
            WhoId=excluded.WhoId
          `,
          row.Id,
          row.AccountId,
          toDuckdbTimestamp(row.ActivityDate),
          parseFieldInt(row.CallDurationInSeconds),
          row.CallObject,
          row.CallType,
          toDuckdbTimestamp(row.CompletedDateTime),
          row.CreatedById,
          toDuckdbTimestamp(row.CreatedDate),
          row.Description,
          row.IsArchived?.toLowerCase?.() === "true",
          row.IsClosed?.toLowerCase?.() === "true",
          row.IsDeleted?.toLowerCase?.() === "true",
          row.IsHighPriority?.toLowerCase?.() === "true",
          row.IsRecurrence?.toLowerCase?.() === "true",
          row.IsReminderSet?.toLowerCase?.() === "true",
          row.LastModifiedById,
          toDuckdbTimestamp(row.LastModifiedDate),
          row.OwnerId,
          row.Priority,
          row.RecurrenceActivityId,
          parseFieldInt(row.RecurrenceDayOfMonth),
          parseFieldInt(row.RecurrenceDayOfWeekMask),
          toDuckdbTimestamp(row.RecurrenceEndDateOnly),
          row.RecurrenceInstance,
          parseFieldInt(row.RecurrenceInterval),
          row.RecurrenceMonthOfYear,
          row.RecurrenceRegeneratedType,
          toDuckdbTimestamp(row.RecurrenceStartDateOnly),
          row.RecurrenceTimeZoneSidKey,
          row.RecurrenceType,
          toDuckdbTimestamp(row.ReminderDateTime),
          row.Status,
          row.Subject,
          toDuckdbTimestamp(row.SystemModstamp),
          row.TaskSubtype,
          row.WhatId,
          row.WhoId
        );
      }
    });
  }

  // Add syncUser method
  async syncUser(): Promise<void> {
    const lastModResult = await this.db.all(`
      SELECT MAX(SystemModstamp) as lastMod
      FROM User
    `);
    let lastMod = lastModResult?.[0]?.lastMod || INITIAL_SYNC_TIME;

    const lastModDate = new Date(lastMod);
    const lastModMinus = new Date(lastModDate.getTime() - 1 * 60 * 60 * 1000);

    const soql = `
      SELECT ${USER_FIELDS}
      FROM User
      WHERE SystemModstamp >= ${formatDateForSoql(lastModMinus)}
    `;

    await this.fetchBulkApi(soql, this.processUserBatch.bind(this));

    this.log("User sync complete.");
  }

  // Add processUserBatch method
  async processUserBatch(rows: any[]): Promise<void> {
    await transaction(this.db, async (conn) => {
      for (const row of rows) {
        await conn.run(
          `
          INSERT INTO User (
            Id,
            AboutMe,
            AccountId,
            Alias,
            BadgeText,
            BannerPhotoUrl,
            CallCenterId,
            City,
            CommunityNickname,
            CompanyName,
            ContactId,
            Country,
            CreatedById,
            CreatedDate,
            DefaultGroupNotificationFrequency,
            DelegatedApproverId,
            Department,
            DigestFrequency,
            Division,
            Email,
            EmailEncodingKey,
            EmployeeNumber,
            Extension,
            Fax,
            FirstName,
            ForecastEnabled,
            FullPhotoUrl,
            GeocodeAccuracy,
            IsActive,
            IsExtIndicatorVisible,
            IsProfilePhotoActive,
            LanguageLocaleKey,
            LastLoginDate,
            LastModifiedById,
            LastModifiedDate,
            LastName,
            LastReferencedDate,
            LastViewedDate,
            Latitude,
            LocaleSidKey,
            Longitude,
            ManagerId,
            MediumBannerPhotoUrl,
            MediumPhotoUrl,
            MobilePhone,
            Name,
            Phone,
            PostalCode,
            ProfileId,
            ReceivesAdminInfoEmails,
            ReceivesInfoEmails,
            SmallBannerPhotoUrl,
            SmallPhotoUrl,
            State,
            Street,
            SystemModstamp,
            TimeZoneSidKey,
            Title,
            Username,
            UserPermissionsMarketingUser,
            UserPermissionsOfflineUser,
            UserType
          )
          VALUES (${Array(62).fill("?").join(",")})
          ON CONFLICT (Id) DO UPDATE SET
            AboutMe=excluded.AboutMe,
            AccountId=excluded.AccountId,
            Alias=excluded.Alias,
            BadgeText=excluded.BadgeText,
            BannerPhotoUrl=excluded.BannerPhotoUrl,
            CallCenterId=excluded.CallCenterId,
            City=excluded.City,
            CommunityNickname=excluded.CommunityNickname,
            CompanyName=excluded.CompanyName,
            ContactId=excluded.ContactId,
            Country=excluded.Country,
            CreatedById=excluded.CreatedById,
            CreatedDate=excluded.CreatedDate,
            DefaultGroupNotificationFrequency=excluded.DefaultGroupNotificationFrequency,
            DelegatedApproverId=excluded.DelegatedApproverId,
            Department=excluded.Department,
            DigestFrequency=excluded.DigestFrequency,
            Division=excluded.Division,
            Email=excluded.Email,
            EmailEncodingKey=excluded.EmailEncodingKey,
            EmployeeNumber=excluded.EmployeeNumber,
            Extension=excluded.Extension,
            Fax=excluded.Fax,
            FirstName=excluded.FirstName,
            ForecastEnabled=excluded.ForecastEnabled,
            FullPhotoUrl=excluded.FullPhotoUrl,
            GeocodeAccuracy=excluded.GeocodeAccuracy,
            IsActive=excluded.IsActive,
            IsExtIndicatorVisible=excluded.IsExtIndicatorVisible,
            IsProfilePhotoActive=excluded.IsProfilePhotoActive,
            LanguageLocaleKey=excluded.LanguageLocaleKey,
            LastLoginDate=excluded.LastLoginDate,
            LastModifiedById=excluded.LastModifiedById,
            LastModifiedDate=excluded.LastModifiedDate,
            LastName=excluded.LastName,
            LastReferencedDate=excluded.LastReferencedDate,
            LastViewedDate=excluded.LastViewedDate,
            Latitude=excluded.Latitude,
            LocaleSidKey=excluded.LocaleSidKey,
            Longitude=excluded.Longitude,
            ManagerId=excluded.ManagerId,
            MediumBannerPhotoUrl=excluded.MediumBannerPhotoUrl,
            MediumPhotoUrl=excluded.MediumPhotoUrl,
            MobilePhone=excluded.MobilePhone,
            Name=excluded.Name,
            Phone=excluded.Phone,
            PostalCode=excluded.PostalCode,
            ProfileId=excluded.ProfileId,
            ReceivesAdminInfoEmails=excluded.ReceivesAdminInfoEmails,
            ReceivesInfoEmails=excluded.ReceivesInfoEmails,
            SmallBannerPhotoUrl=excluded.SmallBannerPhotoUrl,
            SmallPhotoUrl=excluded.SmallPhotoUrl,
            State=excluded.State,
            Street=excluded.Street,
            SystemModstamp=excluded.SystemModstamp,
            TimeZoneSidKey=excluded.TimeZoneSidKey,
            Title=excluded.Title,
            Username=excluded.Username,
            UserPermissionsMarketingUser=excluded.UserPermissionsMarketingUser,
            UserPermissionsOfflineUser=excluded.UserPermissionsOfflineUser,
            UserType=excluded.UserType
          `,
          row.Id,
          row.AboutMe,
          row.AccountId,
          row.Alias,
          row.BadgeText,
          row.BannerPhotoUrl,
          row.CallCenterId,
          row.City,
          row.CommunityNickname,
          row.CompanyName,
          row.ContactId,
          row.Country,
          row.CreatedById,
          toDuckdbTimestamp(row.CreatedDate),
          row.DefaultGroupNotificationFrequency,
          row.DelegatedApproverId,
          row.Department,
          row.DigestFrequency,
          row.Division,
          row.Email,
          row.EmailEncodingKey,
          row.EmployeeNumber,
          row.Extension,
          row.Fax,
          row.FirstName,
          row.ForecastEnabled?.toLowerCase?.() === "true",
          row.FullPhotoUrl,
          row.GeocodeAccuracy,
          row.IsActive?.toLowerCase?.() === "true",
          row.IsExtIndicatorVisible?.toLowerCase?.() === "true",
          row.IsProfilePhotoActive?.toLowerCase?.() === "true",
          row.LanguageLocaleKey,
          toDuckdbTimestamp(row.LastLoginDate),
          row.LastModifiedById,
          toDuckdbTimestamp(row.LastModifiedDate),
          row.LastName,
          toDuckdbTimestamp(row.LastReferencedDate),
          toDuckdbTimestamp(row.LastViewedDate),
          parseFieldFloat(row.Latitude),
          row.LocaleSidKey,
          parseFieldFloat(row.Longitude),
          row.ManagerId,
          row.MediumBannerPhotoUrl,
          row.MediumPhotoUrl,
          row.MobilePhone,
          row.Name,
          row.Phone,
          row.PostalCode,
          row.ProfileId,
          row.ReceivesAdminInfoEmails?.toLowerCase?.() === "true",
          row.ReceivesInfoEmails?.toLowerCase?.() === "true",
          row.SmallBannerPhotoUrl,
          row.SmallPhotoUrl,
          row.State,
          row.Street,
          toDuckdbTimestamp(row.SystemModstamp),
          row.TimeZoneSidKey,
          row.Title,
          row.Username,
          row.UserPermissionsMarketingUser?.toLowerCase?.() === "true",
          row.UserPermissionsOfflineUser?.toLowerCase?.() === "true",
          row.UserType
        );
      }
    });
  }
}

async function fetchWithRetry(
  url: string,
  token: string,
  assertRunning: () => void | never,
  debug: (...args: any[]) => void
): Promise<any> {
  let retryCount = 0;

  let lastError: Error | null = null;

  while (retryCount < ERROR_RETRY_COUNT) {
    assertRunning();

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.status === 429) {
      // Rate limited
      const retryAfter = Number(response.headers.get("retry-after")) || 60;
      lastError = new Error(
        `Rate limited. Waiting for ${retryAfter} seconds...`
      );
      debug(lastError);
      await delay(retryAfter * 1000);
      continue;
    }

    if (!response.ok) {
      lastError = new Error(
        `Error from Zendesk API: ${response.status} ${response.statusText}`
      );
      debug(lastError);
      retryCount++;
      await delay(ERROR_BACKOFF_INTERVAL);
      continue;
    }

    return await response.json();
  }

  throw lastError;
}

// Utility for converting date/datetime strings to something DuckDB will accept
function toDuckdbTimestamp(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  // Ensure it's a valid ISO string or do custom parsing if needed.
  return new Date(value).toISOString();
}

/**
 * Format JS Date into the literal SOQL datetime format:
 * Example: 2023-03-01T10:00:00Z
 */
function formatDateForSoql(date: Date): string {
  // Force UTC, format as yyyy-MM-ddTHH:mm:ssZ
  return `${date.toISOString()}`;
}

// Helper to get the hostname from a full instance URL
function getHostname(url: string): string {
  const u = new URL(url);
  return u.hostname;
}

function parseFieldInt(value: any): number | null {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? null : parsed;
}

function parseFieldFloat(value: any): number | null {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}
