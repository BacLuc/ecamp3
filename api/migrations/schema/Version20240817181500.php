<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20240817181500 extends AbstractMigration {
    public function getDescription(): string {
        return 'Renames safety concept to safety considerations';
    }

    public function up(Schema $schema): void {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql("UPDATE content_type SET name = 'SafetyConsiderations' WHERE name = 'SafetyConcept';");
    }

    public function down(Schema $schema): void {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql("UPDATE content_type SET name = 'SafetyConcept' WHERE name = 'SafetyConsiderations';");
    }
}
