SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;

-- Kilitlenme (deadlock) düzeltmesi: UserSessions tablosunun sıralama anahtarında sık güncellenen LastSeenAt vardı.
-- Her istekte "son görülme" yazılınca satır anahtar içinde yer değiştiriyor, aynı anda gelen oturum doğrulama
-- okumalarıyla ters sırada kilit alınıp birbirini bekliyordu. Anahtar artık değişmeyen sütunlardan oluşur.
IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.UserSessions') AND name = 'IX_UserSessions_User')
    DROP INDEX IX_UserSessions_User ON dbo.UserSessions;
EXEC(N'IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(''dbo.UserSessions'') AND name = ''CX_UserSessions_User'')
    CREATE CLUSTERED INDEX CX_UserSessions_User ON dbo.UserSessions(UserId, Id);');
