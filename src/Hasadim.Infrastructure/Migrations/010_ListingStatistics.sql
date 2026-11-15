ALTER TABLE dbo.Listings ADD OncekiKilogramFiyati decimal(18,2) NULL;
CREATE TABLE dbo.ListingStatistics (
    ListingId uniqueidentifier NOT NULL PRIMARY KEY REFERENCES dbo.Listings(Id),
    ViewCount bigint NOT NULL DEFAULT 0
);
