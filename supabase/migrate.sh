#!/bin/bash

# Supabase Migration Script for SoussMassa-RH
# Execute this script to run all migrations on your Supabase project

echo "🚀 Starting Supabase Migrations for SoussMassa-RH..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if project is linked
if [ ! -f "supabase/.supabase" ]; then
    echo "❌ Project not linked. Please run:"
    echo "   supabase link --project-ref YOUR_PROJECT_REF"
    exit 1
fi

echo "✅ Supabase CLI found and project linked"

# Function to execute SQL file
execute_sql() {
    local file=$1
    local description=$2
    
    echo "📝 Executing: $description"
    if supabase sql < "$file"; then
        echo "✅ $description completed successfully"
    else
        echo "❌ $description failed"
        return 1
    fi
}

# Run migrations in order
echo ""
echo "📋 Running Migrations..."

# Migration 1: Initial Schema
if [ -f "supabase/migrations/001_initial_schema.sql" ]; then
    execute_sql "supabase/migrations/001_initial_schema.sql" "Initial Schema (Tables, Indexes, Sample Data)"
else
    echo "❌ Migration 001 not found"
    exit 1
fi

# Migration 2: Security Policies
if [ -f "supabase/migrations/002_policies.sql" ]; then
    execute_sql "supabase/migrations/002_policies.sql" "Security Policies (RLS)"
else
    echo "❌ Migration 002 not found"
    exit 1
fi

# Migration 3: Storage Policies
if [ -f "supabase/migrations/003_storage_policies.sql" ]; then
    execute_sql "supabase/migrations/003_storage_policies.sql" "Storage Policies (CV Bucket)"
else
    echo "❌ Migration 003 not found"
    exit 1
fi

echo ""
echo "🎉 All migrations completed successfully!"
echo ""
echo "📋 Next Steps:"
echo "1. Create the 'cvs' bucket in Supabase Dashboard > Storage"
echo "2. Deploy Edge Functions: supabase functions deploy cv-parser"
echo "3. Set environment variables in Supabase Dashboard"
echo "4. Test your application!"
echo ""
echo "🔗 Useful Commands:"
echo "   supabase status                    # Check project status"
echo "   supabase logs --name cv-parser     # View function logs"
echo "   supabase db reset                  # Reset database (careful!)"