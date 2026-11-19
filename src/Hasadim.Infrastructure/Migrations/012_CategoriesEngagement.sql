SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;

-- Ana kategoriler (Meyve, Tahıl, Yem/balya, Bal, Kuruyemiş, Arazi), birim,
-- arazi bilgileri ve isteğe bağlı harita konumu.
ALTER TABLE dbo.Listings ADD
    Kategori nvarchar(20) NOT NULL CONSTRAINT DF_Listings_Kategori DEFAULT N'Meyve',
    Birim nvarchar(10) NOT NULL CONSTRAINT DF_Listings_Birim DEFAULT N'kg',
    ImarDurumu nvarchar(40) NULL,
    TapuDurumu nvarchar(40) NULL,
    Sulama nvarchar(40) NULL,
    Ada nvarchar(20) NULL,
    Parsel nvarchar(20) NULL,
    Elektrik bit NULL,
    YolCephesi bit NULL,
    Enlem decimal(9,4) NULL,
    Boylam decimal(9,4) NULL;

-- Arazide fiyat toplam satış fiyatıdır; üst sınırı uygulama denetler.
-- Yeni sütunlara başvuran ifadeler derleme sırası için EXEC ile çalışır.
EXEC(N'ALTER TABLE dbo.Listings ADD CONSTRAINT CK_Listings_Kategori CHECK (Kategori IN (N''Meyve'',N''Tahil'',N''Yem'',N''Bal'',N''Kuruyemis'',N''Arazi''))');
EXEC(N'ALTER TABLE dbo.Listings ADD CONSTRAINT CK_Listings_Birim CHECK (Birim IN (N''kg'',N''balya'',N''m2''))');
EXEC(N'CREATE INDEX IX_Listings_Category ON dbo.Listings(Kategori,MeyveTuru,Il) INCLUDE(KilogramFiyati,MiktarKg) WHERE IsDeleted=0 AND Hidden=0 AND Active=1 AND Status=4');

-- Teklifler: alıcı ilana fiyat (ve miktar) önerir, satıcı kabul eder veya reddeder.
CREATE TABLE dbo.Offers (
    Id uniqueidentifier NOT NULL PRIMARY KEY NONCLUSTERED,
    ListingId uniqueidentifier NOT NULL REFERENCES dbo.Listings(Id),
    BuyerId uniqueidentifier NOT NULL REFERENCES dbo.Users(Id),
    SellerId uniqueidentifier NOT NULL REFERENCES dbo.Users(Id),
    Amount decimal(18,2) NOT NULL CONSTRAINT CK_Offers_Amount CHECK (Amount > 0),
    Quantity decimal(18,2) NULL CONSTRAINT CK_Offers_Quantity CHECK (Quantity IS NULL OR Quantity > 0),
    Note nvarchar(500) NULL,
    Reply nvarchar(500) NULL,
    Status tinyint NOT NULL CONSTRAINT DF_Offers_Status DEFAULT 0 CONSTRAINT CK_Offers_Status CHECK (Status BETWEEN 0 AND 3),
    CreatedAt datetime2 NOT NULL CONSTRAINT DF_Offers_CreatedAt DEFAULT SYSUTCDATETIME(),
    RespondedAt datetime2 NULL
);
CREATE CLUSTERED INDEX IX_Offers_Created ON dbo.Offers(CreatedAt DESC, Id);
CREATE INDEX IX_Offers_Buyer ON dbo.Offers(BuyerId, CreatedAt DESC);
CREATE INDEX IX_Offers_Seller ON dbo.Offers(SellerId, Status, CreatedAt DESC);
-- Bir alıcının aynı ilanda yalnızca bir bekleyen teklifi olabilir.
EXEC(N'CREATE UNIQUE INDEX UX_Offers_Pending ON dbo.Offers(ListingId, BuyerId) WHERE Status = 0');

-- Uygulama içi bildirimler.
CREATE TABLE dbo.Notifications (
    Id uniqueidentifier NOT NULL PRIMARY KEY NONCLUSTERED,
    UserId uniqueidentifier NOT NULL REFERENCES dbo.Users(Id),
    Kind nvarchar(30) NOT NULL,
    Title nvarchar(150) NOT NULL,
    Body nvarchar(400) NOT NULL,
    Link nvarchar(300) NULL,
    Data nvarchar(1000) NULL,
    CreatedAt datetime2 NOT NULL CONSTRAINT DF_Notifications_CreatedAt DEFAULT SYSUTCDATETIME(),
    ReadAt datetime2 NULL
);
CREATE CLUSTERED INDEX IX_Notifications_User ON dbo.Notifications(UserId, CreatedAt DESC, Id);
EXEC(N'CREATE INDEX IX_Notifications_Unread ON dbo.Notifications(UserId) WHERE ReadAt IS NULL');

-- Kayıtlı aramalar: adres satırındaki filtreler ve yeni ilan eşleştirmesi için ana alanlar.
CREATE TABLE dbo.SavedSearches (
    Id uniqueidentifier NOT NULL PRIMARY KEY,
    UserId uniqueidentifier NOT NULL REFERENCES dbo.Users(Id),
    Name nvarchar(80) NOT NULL,
    Query nvarchar(1000) NOT NULL,
    Kategori nvarchar(20) NULL,
    MeyveTuru nvarchar(100) NULL,
    Cesit nvarchar(100) NULL,
    Il nvarchar(100) NULL,
    Ilce nvarchar(100) NULL,
    MinFiyat decimal(18,2) NULL,
    MaxFiyat decimal(18,2) NULL,
    Q nvarchar(150) NULL,
    Notify bit NOT NULL CONSTRAINT DF_SavedSearches_Notify DEFAULT 1,
    CreatedAt datetime2 NOT NULL CONSTRAINT DF_SavedSearches_CreatedAt DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_SavedSearches_User ON dbo.SavedSearches(UserId, CreatedAt DESC);
EXEC(N'CREATE INDEX IX_SavedSearches_Match ON dbo.SavedSearches(Kategori, MeyveTuru, Il) WHERE Notify = 1');

-- Üye engelleme: engellenen üye mesaj ve teklif gönderemez, ilanları gizlenir.
CREATE TABLE dbo.UserBlocks (
    BlockerId uniqueidentifier NOT NULL REFERENCES dbo.Users(Id),
    BlockedId uniqueidentifier NOT NULL REFERENCES dbo.Users(Id),
    CreatedAt datetime2 NOT NULL CONSTRAINT DF_UserBlocks_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_UserBlocks PRIMARY KEY (BlockerId, BlockedId),
    CONSTRAINT CK_UserBlocks_Self CHECK (BlockerId <> BlockedId)
);
CREATE INDEX IX_UserBlocks_Blocked ON dbo.UserBlocks(BlockedId, BlockerId);

-- Dil, tema ve bildirim tercihleri.
CREATE TABLE dbo.UserSettings (
    UserId uniqueidentifier NOT NULL PRIMARY KEY REFERENCES dbo.Users(Id),
    Language char(2) NOT NULL CONSTRAINT DF_UserSettings_Language DEFAULT 'tr' CONSTRAINT CK_UserSettings_Language CHECK (Language IN ('tr','en')),
    Theme varchar(6) NOT NULL CONSTRAINT DF_UserSettings_Theme DEFAULT 'system' CONSTRAINT CK_UserSettings_Theme CHECK (Theme IN ('system','light','dark')),
    NotifyMessages bit NOT NULL CONSTRAINT DF_UserSettings_Messages DEFAULT 1,
    NotifyOffers bit NOT NULL CONSTRAINT DF_UserSettings_Offers DEFAULT 1,
    NotifySavedSearches bit NOT NULL CONSTRAINT DF_UserSettings_Saved DEFAULT 1,
    NotifyPriceDrops bit NOT NULL CONSTRAINT DF_UserSettings_Price DEFAULT 1,
    UpdatedAt datetime2 NOT NULL CONSTRAINT DF_UserSettings_UpdatedAt DEFAULT SYSUTCDATETIME()
);

-- Hesap silme: kişisel bilgiler temizlenir, kayıt anonim olarak kalır
-- (karşı tarafın mesaj ve teklif geçmişi bozulmasın diye).
ALTER TABLE dbo.Users ADD DeletedAt datetime2 NULL;
