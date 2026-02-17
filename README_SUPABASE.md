# 🚀 Supabase Setup Guide for SoussMassa-RH

## Quick Start

### 1. **Run Migrations Automatically**

```bash
# Make the script executable (Linux/Mac)
chmod +x supabase/migrate.sh

# Run all migrations
./supabase/migrate.sh
```

**Windows Users**: Run the SQL files manually or use Git Bash.

### 2. **Manual Migration (Alternative)**

```bash
# Run each migration file individually
supabase sql < supabase/migrations/001_initial_schema.sql
supabase sql < supabase/migrations/002_policies.sql
supabase sql < supabase/migrations/003_storage_policies.sql
```

## 📋 What Gets Created Automatically

### ✅ **Database Schema**
- **3 tables** : `job_offers`, `users`, `applications`
- **Indexes** : Optimized for performance
- **Triggers** : Auto-update timestamps
- **Sample data** : 6 real job offers for testing

### ✅ **Security Policies**
- **Row Level Security** : Enabled on all tables
- **Public access** : Read job offers
- **User isolation** : Users see only their data
- **Admin access** : Service role manages offers

### ✅ **Storage Configuration**
- **CV bucket** : `cvs` bucket policies
- **Upload permissions** : Users can upload CVs
- **Read permissions** : Public CV access
- **Security** : User-specific folders

## 🎯 **Answer to Your Question**

> **"Est-ce que le fichier SQL schema va tout créer automatiquement ?"**

**✅ OUI !** Les fichiers SQL vont créer automatiquement :

1. **Tables & Relations** - Structure complète de la base
2. **Security Policies** - Règles de sécurité avancées
3. **Indexes** - Performances optimisées
4. **Sample Data** - Données de test pour démarrer
5. **Triggers** - Fonctionnalités automatiques

**Seul point manuel** : Créer le bucket `cvs` dans le Dashboard Supabase.

## 🚀 **Next Steps After Migration**

1. **Create CV Bucket** : Dashboard > Storage > New Bucket > `cvs`
2. **Deploy Functions** : `supabase functions deploy cv-parser`
3. **Set Environment Variables** : Dashboard > Settings > Config
4. **Test Application** : Vérifiez que tout fonctionne

## 📁 **Files Structure**

```
supabase/
├── migrations/
│   ├── 001_initial_schema.sql    # Tables + Data
│   ├── 002_policies.sql          # Security
│   └── 003_storage_policies.sql  # Storage
├── migrate.sh                    # Automated script
└── README_SUPABASE.md           # This guide
```

## 🎉 **You're Ready!**

Your Supabase database is now **production-ready** with:
- ✅ Complete schema
- ✅ Security policies
- ✅ Sample data
- ✅ Optimized performance
- ✅ Ready for your frontend!

Just run the migration script and you're all set! 🚀