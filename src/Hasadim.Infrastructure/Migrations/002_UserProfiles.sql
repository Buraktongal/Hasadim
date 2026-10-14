-- Do not modify migration 001. Existing membership dates were not recorded.
ALTER TABLE dbo.Users ADD CreatedAt datetime2 NULL CONSTRAINT DF_Users_CreatedAt DEFAULT SYSUTCDATETIME();
CREATE TABLE dbo.UserProfiles(
 UserId uniqueidentifier NOT NULL PRIMARY KEY REFERENCES dbo.Users(Id),
 AccountType nvarchar(20) NOT NULL CONSTRAINT DF_Profiles_Account DEFAULT 'Individual',
 Activity nvarchar(20) NOT NULL CONSTRAINT DF_Profiles_Activity DEFAULT 'Producer',
 BusinessName nvarchar(150) NOT NULL CONSTRAINT DF_Profiles_Business DEFAULT '',
 City nvarchar(100) NOT NULL CONSTRAINT DF_Profiles_City DEFAULT '',
 District nvarchar(100) NOT NULL CONSTRAINT DF_Profiles_District DEFAULT '',
 About nvarchar(2000) NOT NULL CONSTRAINT DF_Profiles_About DEFAULT '',
 Phone nvarchar(25) NOT NULL CONSTRAINT DF_Profiles_Phone DEFAULT '',
 ShowPhone bit NOT NULL CONSTRAINT DF_Profiles_ShowPhone DEFAULT 1,
 PhotoFile nvarchar(100) NULL,
 Version rowversion NOT NULL,
 CONSTRAINT CK_Profile_Account CHECK(AccountType IN ('Individual','Business')),
 CONSTRAINT CK_Profile_Activity CHECK(Activity IN ('Producer','Buyer','Trader','Cooperative','Other')),
 CONSTRAINT CK_Profile_Business CHECK(AccountType<>'Business' OR LEN(LTRIM(RTRIM(BusinessName)))>0)
);
INSERT dbo.UserProfiles(UserId) SELECT Id FROM dbo.Users;
