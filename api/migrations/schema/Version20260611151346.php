<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260611151346 extends AbstractMigration {
    #[\Override]
    public function getDescription(): string {
        return 'Add threading, inline anchor and resolve fields to comment';
    }

    #[\Override]
    public function up(Schema $schema): void {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE comment ADD anchorId VARCHAR(36) DEFAULT NULL');
        $this->addSql('ALTER TABLE comment ADD anchorText TEXT DEFAULT NULL');
        $this->addSql('ALTER TABLE comment ADD editedAt TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL');
        $this->addSql('ALTER TABLE comment ADD resolvedAt TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL');
        $this->addSql('ALTER TABLE comment ADD parentId VARCHAR(16) DEFAULT NULL');
        $this->addSql('ALTER TABLE comment ADD contentNodeId VARCHAR(16) DEFAULT NULL');
        $this->addSql('ALTER TABLE comment ADD resolvedById VARCHAR(16) DEFAULT NULL');
        $this->addSql('ALTER TABLE comment ADD CONSTRAINT FK_9474526C10EE4CEE FOREIGN KEY (parentId) REFERENCES comment (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE comment ADD CONSTRAINT FK_9474526C6F35AAFF FOREIGN KEY (contentNodeId) REFERENCES content_node (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE comment ADD CONSTRAINT FK_9474526C31AD1E75 FOREIGN KEY (resolvedById) REFERENCES "user" (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('CREATE INDEX IDX_9474526C10EE4CEE ON comment (parentId)');
        $this->addSql('CREATE INDEX IDX_9474526C6F35AAFF ON comment (contentNodeId)');
        $this->addSql('CREATE INDEX IDX_9474526C31AD1E75 ON comment (resolvedById)');
    }

    #[\Override]
    public function down(Schema $schema): void {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE comment DROP CONSTRAINT FK_9474526C10EE4CEE');
        $this->addSql('ALTER TABLE comment DROP CONSTRAINT FK_9474526C6F35AAFF');
        $this->addSql('ALTER TABLE comment DROP CONSTRAINT FK_9474526C31AD1E75');
        $this->addSql('DROP INDEX IDX_9474526C10EE4CEE');
        $this->addSql('DROP INDEX IDX_9474526C6F35AAFF');
        $this->addSql('DROP INDEX IDX_9474526C31AD1E75');
        $this->addSql('ALTER TABLE comment DROP anchorId');
        $this->addSql('ALTER TABLE comment DROP anchorText');
        $this->addSql('ALTER TABLE comment DROP editedAt');
        $this->addSql('ALTER TABLE comment DROP resolvedAt');
        $this->addSql('ALTER TABLE comment DROP parentId');
        $this->addSql('ALTER TABLE comment DROP contentNodeId');
        $this->addSql('ALTER TABLE comment DROP resolvedById');
    }
}
