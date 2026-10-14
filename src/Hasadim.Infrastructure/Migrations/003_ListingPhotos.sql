CREATE TABLE dbo.ListingPhotos(
 Id uniqueidentifier NOT NULL PRIMARY KEY,
 ListingId uniqueidentifier NOT NULL REFERENCES dbo.Listings(Id),
 Url nvarchar(500) NOT NULL,
 SortOrder int NOT NULL,
 CONSTRAINT UQ_ListingPhotos_Order UNIQUE(ListingId,SortOrder)
);
INSERT dbo.ListingPhotos(Id,ListingId,Url,SortOrder)
SELECT NEWID(),Id,PhotoUrl,0 FROM dbo.Listings WHERE PhotoUrl IS NOT NULL;
