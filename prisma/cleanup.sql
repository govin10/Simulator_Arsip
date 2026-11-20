-- Menghapus tabel simulator arsip versi lama (bila masih ada). Aman dijalankan berulang.
DROP TABLE IF EXISTS "ErrorLog", "Event", "RetrievalResult", "Attempt", "PracticeSession", "RetrievalTask", "Document", "Package" CASCADE;
DROP TYPE IF EXISTS "FilingSystem", "PackageKind", "AttemptStatus";
