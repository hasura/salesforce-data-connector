export const DATABASE_SCHEMA = `
    ${schemaLead()}
    ${schemaAccount()}
    ${schemaCampaign()}
    ${schemaCampaignMember()}
    ${schemaContact()}
    ${schemaContract()}
    ${schemaEvent()}
    ${schemaOpportunity()}
    ${schemaOpportunityContactRole()}
    ${schemaOpportunityLineItem()}
    ${schemaProduct2()}
    ${schemaTask()}
    ${schemaUser()}

    CREATE TABLE IF NOT EXISTS incremental_sync_cursors (
      model TEXT PRIMARY KEY,
      cursor TEXT
    );

    CREATE TABLE IF NOT EXISTS ddn_tenant_state (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `;

export function schemaLead(): string {
  // Mapping Salesforce fields to DuckDB types.
  // Adjust these as you see fit (some are simplified to TEXT for convenience).
  return `
    CREATE TABLE IF NOT EXISTS Lead (
      Id TEXT PRIMARY KEY,
      Salutation TEXT,
      FirstName TEXT,
      LastName TEXT,
      Name TEXT,
      Title TEXT,
      Company TEXT,
      Street TEXT,
      City TEXT,
      State TEXT,
      PostalCode TEXT,
      Country TEXT,
      Phone TEXT,
      Email TEXT,
      Website TEXT,
      LeadSource TEXT,
      Status TEXT,
      Industry TEXT,
      NumberOfEmployees INT,
      AnnualRevenue DOUBLE,
      Rating TEXT,
      IsConverted BOOLEAN,
      ConvertedDate TIMESTAMP,
      ConvertedAccountId TEXT,
      ConvertedContactId TEXT,
      ConvertedOpportunityId TEXT,
      IsDeleted BOOLEAN,
      CreatedDate TIMESTAMP,
      CreatedById TEXT,
      LastModifiedDate TIMESTAMP,
      LastModifiedById TEXT,
      SystemModstamp TIMESTAMP
    );
  `;
}

export function schemaAccount(): string {
  return `
    CREATE TABLE IF NOT EXISTS Account (
      Id TEXT PRIMARY KEY,
      AccountSource TEXT,
      AnnualRevenue DOUBLE,
      BillingCity TEXT,
      BillingCountry TEXT,
      BillingGeocodeAccuracy TEXT,
      BillingLatitude DOUBLE,
      BillingLongitude DOUBLE,
      BillingPostalCode TEXT,
      BillingState TEXT,
      BillingStreet TEXT,
      CreatedById TEXT,
      CreatedDate TIMESTAMP,
      Description TEXT,
      Fax TEXT,
      FirstName TEXT,
      Industry TEXT,
      IsDeleted BOOLEAN,
      IsPersonAccount BOOLEAN,
      Jigsaw TEXT,
      JigsawCompanyId TEXT,
      LastActivityDate TIMESTAMP,
      LastModifiedById TEXT,
      LastModifiedDate TIMESTAMP,
      LastName TEXT,
      LastReferencedDate TIMESTAMP,
      LastViewedDate TIMESTAMP,
      MasterRecordId TEXT,
      Name TEXT,
      NumberOfEmployees INT,
      OwnerId TEXT,
      ParentId TEXT,
      Phone TEXT,
      PhotoUrl TEXT,
      RecordTypeId TEXT,
      Salutation TEXT,
      ShippingCity TEXT,
      ShippingCountry TEXT,
      ShippingGeocodeAccuracy TEXT,
      ShippingLatitude DOUBLE,
      ShippingLongitude DOUBLE,
      ShippingPostalCode TEXT,
      ShippingState TEXT,
      ShippingStreet TEXT,
      SicDesc TEXT,
      SystemModstamp TIMESTAMP,
      Type TEXT,
      Website TEXT
    );
  `;
}

export function schemaCampaign(): string {
  return `
    CREATE TABLE IF NOT EXISTS Campaign (
      Id TEXT PRIMARY KEY,
      ActualCost DOUBLE,
      AmountAllOpportunities DOUBLE,
      AmountWonOpportunities DOUBLE,
      BudgetedCost DOUBLE,
      CampaignMemberRecordTypeId TEXT,
      CreatedById TEXT,
      CreatedDate TIMESTAMP,
      Description TEXT,
      EndDate TIMESTAMP,
      ExpectedResponse DOUBLE,
      ExpectedRevenue DOUBLE,
      IsActive BOOLEAN,
      IsDeleted BOOLEAN,
      LastActivityDate TIMESTAMP,
      LastModifiedById TEXT,
      LastModifiedDate TIMESTAMP,
      LastReferencedDate TIMESTAMP,
      LastViewedDate TIMESTAMP,
      Name TEXT,
      NumberOfContacts INT,
      NumberOfConvertedLeads INT,
      NumberOfLeads INT,
      NumberOfOpportunities INT,
      NumberOfResponses INT,
      NumberOfWonOpportunities INT,
      NumberSent DOUBLE,
      OwnerId TEXT,
      ParentId TEXT,
      StartDate TIMESTAMP,
      Status TEXT,
      SystemModstamp TIMESTAMP,
      Type TEXT
    );
  `;
}

export function schemaCampaignMember(): string {
  return `
    CREATE TABLE IF NOT EXISTS CampaignMember (
      Id TEXT PRIMARY KEY,
      CampaignId TEXT,
      City TEXT,
      CompanyOrAccount TEXT,
      ContactId TEXT,
      Country TEXT,
      CreatedById TEXT,
      CreatedDate TIMESTAMP,
      Description TEXT,
      DoNotCall BOOLEAN,
      Email TEXT,
      Fax TEXT,
      FirstName TEXT,
      FirstRespondedDate TIMESTAMP,
      HasOptedOutOfEmail BOOLEAN,
      HasOptedOutOfFax BOOLEAN,
      HasResponded BOOLEAN,
      IsDeleted BOOLEAN,
      LastModifiedById TEXT,
      LastModifiedDate TIMESTAMP,
      LastName TEXT,
      LeadId TEXT,
      LeadOrContactId TEXT,
      LeadOrContactOwnerId TEXT,
      LeadSource TEXT,
      MobilePhone TEXT,
      Name TEXT,
      Phone TEXT,
      PostalCode TEXT,
      Salutation TEXT,
      State TEXT,
      Status TEXT,
      Street TEXT,
      SystemModstamp TIMESTAMP,
      Title TEXT,
      Type TEXT
    );
  `;
}

export function schemaContact(): string {
  return `
    CREATE TABLE IF NOT EXISTS Contact (
      Id TEXT PRIMARY KEY,
      AccountId TEXT,
      AssistantName TEXT,
      AssistantPhone TEXT,
      Birthdate TIMESTAMP,
      ContactSource TEXT,
      CreatedById TEXT,
      CreatedDate TIMESTAMP,
      Department TEXT,
      Description TEXT,
      Email TEXT,
      EmailBouncedDate TIMESTAMP,
      EmailBouncedReason TEXT,
      Fax TEXT,
      FirstName TEXT,
      GenderIdentity TEXT,
      HomePhone TEXT,
      IndividualId TEXT,
      IsDeleted BOOLEAN,
      IsEmailBounced BOOLEAN,
      IsPersonAccount BOOLEAN,
      Jigsaw TEXT,
      JigsawContactId TEXT,
      LastActivityDate TIMESTAMP,
      LastCURequestDate TIMESTAMP,
      LastCUUpdateDate TIMESTAMP,
      LastModifiedById TEXT,
      LastModifiedDate TIMESTAMP,
      LastName TEXT,
      LastReferencedDate TIMESTAMP,
      LastViewedDate TIMESTAMP,
      LeadSource TEXT,
      MailingCity TEXT,
      MailingCountry TEXT,
      MailingGeocodeAccuracy TEXT,
      MailingLatitude DOUBLE,
      MailingLongitude DOUBLE,
      MailingPostalCode TEXT,
      MailingState TEXT,
      MailingStreet TEXT,
      MasterRecordId TEXT,
      MobilePhone TEXT,
      Name TEXT,
      OtherCity TEXT,
      OtherCountry TEXT,
      OtherGeocodeAccuracy TEXT,
      OtherLatitude DOUBLE,
      OtherLongitude DOUBLE,
      OtherPhone TEXT,
      OtherPostalCode TEXT,
      OtherState TEXT,
      OtherStreet TEXT,
      OwnerId TEXT,
      Phone TEXT,
      PhotoUrl TEXT,
      Pronouns TEXT,
      ReportsToId TEXT,
      Salutation TEXT,
      SystemModstamp TIMESTAMP,
      Title TEXT
    );
  `;
}

export function schemaContract(): string {
  return `
    CREATE TABLE IF NOT EXISTS Contract (
      Id TEXT PRIMARY KEY,
      AccountId TEXT,
      ActivatedById TEXT,
      ActivatedDate TIMESTAMP,
      BillingCity TEXT,
      BillingCountry TEXT,
      BillingGeocodeAccuracy TEXT,
      BillingLatitude DOUBLE,
      BillingLongitude DOUBLE,
      BillingPostalCode TEXT,
      BillingState TEXT,
      BillingStreet TEXT,
      CompanySignedDate TIMESTAMP,
      CompanySignedId TEXT,
      ContractNumber TEXT,
      ContractTerm INT,
      CreatedById TEXT,
      CreatedDate TIMESTAMP,
      CustomerSignedDate TIMESTAMP,
      CustomerSignedId TEXT,
      CustomerSignedTitle TEXT,
      Description TEXT,
      EndDate TIMESTAMP,
      IsDeleted BOOLEAN,
      LastActivityDate TIMESTAMP,
      LastApprovedDate TIMESTAMP,
      LastModifiedById TEXT,
      LastModifiedDate TIMESTAMP,
      LastReferencedDate TIMESTAMP,
      LastViewedDate TIMESTAMP,
      OwnerExpirationNotice TEXT,
      OwnerId TEXT,
      ShippingCity TEXT,
      ShippingCountry TEXT,
      ShippingGeocodeAccuracy TEXT,
      ShippingLatitude DOUBLE,
      ShippingLongitude DOUBLE,
      ShippingPostalCode TEXT,
      ShippingState TEXT,
      ShippingStreet TEXT,
      SpecialTerms TEXT,
      StartDate TIMESTAMP,
      Status TEXT,
      StatusCode TEXT,
      SystemModstamp TIMESTAMP
    );
  `;
}

export function schemaEvent(): string {
  return `
    CREATE TABLE IF NOT EXISTS Event (
      Id TEXT PRIMARY KEY,
      AccountId TEXT,
      ActivityDate TIMESTAMP,
      ActivityDateTime TIMESTAMP,
      CreatedById TEXT,
      CreatedDate TIMESTAMP,
      Description TEXT,
      DurationInMinutes INT,
      EndDate TIMESTAMP,
      EndDateTime TIMESTAMP,
      EventSubtype TEXT,
      GroupEventType TEXT,
      IsAllDayEvent BOOLEAN,
      IsArchived BOOLEAN,
      IsChild BOOLEAN,
      IsDeleted BOOLEAN,
      IsGroupEvent BOOLEAN,
      IsPrivate BOOLEAN,
      IsRecurrence BOOLEAN,
      IsRecurrence2 BOOLEAN,
      IsRecurrence2Exception BOOLEAN,
      IsRecurrence2Exclusion BOOLEAN,
      IsReminderSet BOOLEAN,
      LastModifiedById TEXT,
      LastModifiedDate TIMESTAMP,
      Location TEXT,
      OwnerId TEXT,
      Recurrence2PatternStartDate TIMESTAMP,
      Recurrence2PatternText TEXT,
      Recurrence2PatternTimeZone TEXT,
      Recurrence2PatternVersion TEXT,
      RecurrenceActivityId TEXT,
      RecurrenceDayOfMonth INT,
      RecurrenceDayOfWeekMask INT,
      RecurrenceEndDateOnly TIMESTAMP,
      RecurrenceInstance TEXT,
      RecurrenceInterval INT,
      RecurrenceMonthOfYear TEXT,
      RecurrenceStartDateTime TIMESTAMP,
      RecurrenceTimeZoneSidKey TEXT,
      RecurrenceType TEXT,
      ReminderDateTime TIMESTAMP,
      ShowAs TEXT,
      StartDateTime TIMESTAMP,
      Subject TEXT,
      SystemModstamp TIMESTAMP,
      WhatId TEXT,
      WhoId TEXT
    );
  `;
}

export function schemaOpportunity(): string {
  return `
    CREATE TABLE IF NOT EXISTS Opportunity (
      Id TEXT PRIMARY KEY,
      AccountId TEXT,
      Amount DOUBLE,
      CloseDate TIMESTAMP,
      ContactId TEXT,
      CreatedById TEXT,
      CreatedDate TIMESTAMP,
      Description TEXT,
      Fiscal TEXT,
      FiscalQuarter INT,
      FiscalYear INT,
      ForecastCategory TEXT,
      ForecastCategoryName TEXT,
      HasOpenActivity BOOLEAN,
      HasOpportunityLineItem BOOLEAN,
      HasOverdueTask BOOLEAN,
      IsClosed BOOLEAN,
      IsDeleted BOOLEAN,
      IsWon BOOLEAN,
      LastActivityDate TIMESTAMP,
      LastAmountChangedHistoryId TEXT,
      LastCloseDateChangedHistoryId TEXT,
      LastModifiedById TEXT,
      LastModifiedDate TIMESTAMP,
      LastReferencedDate TIMESTAMP,
      LastStageChangeDate TIMESTAMP,
      LastViewedDate TIMESTAMP,
      LeadSource TEXT,
      Name TEXT,
      NextStep TEXT,
      OwnerId TEXT,
      Pricebook2Id TEXT,
      Probability DOUBLE,
      PushCount INT,
      StageName TEXT,
      SystemModstamp TIMESTAMP,
      Type TEXT
    );
  `;
}

export function schemaOpportunityContactRole(): string {
  return `
    CREATE TABLE IF NOT EXISTS OpportunityContactRole (
      Id TEXT PRIMARY KEY,
      ContactId TEXT,
      CreatedById TEXT,
      CreatedDate TIMESTAMP,
      IsDeleted BOOLEAN,
      IsPrimary BOOLEAN,
      LastModifiedById TEXT,
      LastModifiedDate TIMESTAMP,
      OpportunityId TEXT,
      Role TEXT,
      SystemModstamp TIMESTAMP
    );
  `;
}

export function schemaOpportunityLineItem(): string {
  return `
    CREATE TABLE IF NOT EXISTS OpportunityLineItem (
      Id TEXT PRIMARY KEY,
      CreatedById TEXT,
      CreatedDate TIMESTAMP,
      Description TEXT,
      IsDeleted BOOLEAN,
      LastModifiedById TEXT,
      LastModifiedDate TIMESTAMP,
      ListPrice DOUBLE,
      Name TEXT,
      OpportunityId TEXT,
      PricebookEntryId TEXT,
      Product2Id TEXT,
      ProductCode TEXT,
      Quantity DOUBLE,
      ServiceDate TIMESTAMP,
      SortOrder INT,
      SystemModstamp TIMESTAMP,
      TotalPrice DOUBLE,
      UnitPrice DOUBLE
    );
  `;
}

export function schemaProduct2(): string {
  return `
    CREATE TABLE IF NOT EXISTS Product2 (
      Id TEXT PRIMARY KEY,
      CreatedById TEXT,
      CreatedDate TIMESTAMP,
      Description TEXT,
      DisplayUrl TEXT,
      ExternalDataSourceId TEXT,
      ExternalId TEXT,
      Family TEXT,
      IsActive BOOLEAN,
      IsArchived BOOLEAN,
      IsDeleted BOOLEAN,
      LastModifiedById TEXT,
      LastModifiedDate TIMESTAMP,
      LastReferencedDate TIMESTAMP,
      LastViewedDate TIMESTAMP,
      Name TEXT,
      ProductCode TEXT,
      QuantityUnitOfMeasure TEXT,
      StockKeepingUnit TEXT,
      SystemModstamp TIMESTAMP
    );
  `;
}

export function schemaTask(): string {
  return `
    CREATE TABLE IF NOT EXISTS Task (
      Id TEXT PRIMARY KEY,
      AccountId TEXT,
      ActivityDate TIMESTAMP,
      CallDurationInSeconds INT,
      CallObject TEXT,
      CallType TEXT,
      CompletedDateTime TIMESTAMP,
      CreatedById TEXT,
      CreatedDate TIMESTAMP,
      Description TEXT,
      IsArchived BOOLEAN,
      IsClosed BOOLEAN,
      IsDeleted BOOLEAN,
      IsHighPriority BOOLEAN,
      IsRecurrence BOOLEAN,
      IsReminderSet BOOLEAN,
      LastModifiedById TEXT,
      LastModifiedDate TIMESTAMP,
      OwnerId TEXT,
      Priority TEXT,
      RecurrenceActivityId TEXT,
      RecurrenceDayOfMonth INT,
      RecurrenceDayOfWeekMask INT,
      RecurrenceEndDateOnly TIMESTAMP,
      RecurrenceInstance TEXT,
      RecurrenceInterval INT,
      RecurrenceMonthOfYear TEXT,
      RecurrenceRegeneratedType TEXT,
      RecurrenceStartDateOnly TIMESTAMP,
      RecurrenceTimeZoneSidKey TEXT,
      RecurrenceType TEXT,
      ReminderDateTime TIMESTAMP,
      Status TEXT,
      Subject TEXT,
      SystemModstamp TIMESTAMP,
      TaskSubtype TEXT,
      Type TEXT,
      WhatId TEXT,
      WhoId TEXT
    );
  `;
}

export function schemaUser(): string {
  return `
    CREATE TABLE IF NOT EXISTS User (
      Id TEXT PRIMARY KEY,
      AboutMe TEXT,
      AccountId TEXT,
      Alias TEXT,
      BadgeText TEXT,
      BannerPhotoUrl TEXT,
      CallCenterId TEXT,
      City TEXT,
      CommunityNickname TEXT,
      CompanyName TEXT,
      ContactId TEXT,
      Country TEXT,
      CreatedById TEXT,
      CreatedDate TIMESTAMP,
      DefaultGroupNotificationFrequency TEXT,
      DelegatedApproverId TEXT,
      Department TEXT,
      DigestFrequency TEXT,
      Division TEXT,
      Email TEXT,
      EmailEncodingKey TEXT,
      EmployeeNumber TEXT,
      Extension TEXT,
      Fax TEXT,
      FirstName TEXT,
      ForecastEnabled BOOLEAN,
      FullPhotoUrl TEXT,
      GeocodeAccuracy TEXT,
      IsActive BOOLEAN,
      IsExtIndicatorVisible BOOLEAN,
      IsProfilePhotoActive BOOLEAN,
      LanguageLocaleKey TEXT,
      LastLoginDate TIMESTAMP,
      LastModifiedById TEXT,
      LastModifiedDate TIMESTAMP,
      LastName TEXT,
      LastReferencedDate TIMESTAMP,
      LastViewedDate TIMESTAMP,
      Latitude DOUBLE,
      LocaleSidKey TEXT,
      Longitude DOUBLE,
      ManagerId TEXT,
      MediumBannerPhotoUrl TEXT,
      MediumPhotoUrl TEXT,
      MobilePhone TEXT,
      Name TEXT,
      Phone TEXT,
      PostalCode TEXT,
      ProfileId TEXT,
      ReceivesAdminInfoEmails BOOLEAN,
      ReceivesInfoEmails BOOLEAN,
      SmallBannerPhotoUrl TEXT,
      SmallPhotoUrl TEXT,
      State TEXT,
      Street TEXT,
      SystemModstamp TIMESTAMP,
      TimeZoneSidKey TEXT,
      Title TEXT,
      Username TEXT,
      UserPermissionsMarketingUser BOOLEAN,
      UserPermissionsOfflineUser BOOLEAN,
      UserType TEXT
    );
  `;
}
