<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version1initial extends AbstractMigration {
    public function getDescription(): string {
        return 'initial schema';
    }

    public function up(Schema $schema): void {
        $initialUpTo = "Version20250809140557"
        $result = $this->connection->executeQuery('SELECT 1 FROM doctrine_migration_versions WHERE version = :version', ['version' => $initialUpTo]);
        if ($result->rowCount() > 0) {
            return;
        }
        $statements = getStatementsForMigrationFile(__DIR__.'/initial_schema.sql');
        foreach ($statements as $statement) {
            if (trim($statement)) {
                $this->addSql($statement);
            }
        }
    }

    public function down(Schema $schema): void {

    }
}
