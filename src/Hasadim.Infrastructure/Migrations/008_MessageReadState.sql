ALTER TABLE dbo.Messages ADD ReadAt datetime2 NULL;
EXEC(N'CREATE INDEX IX_Messages_Unread ON dbo.Messages(RecipientId,CreatedAt DESC,Id) WHERE ReadAt IS NULL');
