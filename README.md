
# 🚀 SoussMassa-RH - Guide de Démarrage Rapide

Ce projet est une plateforme RH complète intégrant un frontend React et un backend Serverless.

## 🛠️ Choix du Déploiement

Vous avez deux options pour déployer l'infrastructure sur AWS :

### Option A : AWS CDK (Recommandé)
Le code est situé dans `aws-cdk-stack.ts`.
1. `npm install`
2. `npx cdk bootstrap`
3. `npx cdk deploy`

### Option B : Terraform
Le code est situé dans le dossier `/terraform`.
1. Installez [Terraform](https://www.terraform.io/)
2. `cd terraform`
3. `terraform init`
4. `terraform apply`

## 📁 Structure du Projet
*   `/backend` : Code source des fonctions AWS Lambda (Node.js).
*   `/terraform` : Fichiers de configuration HCL pour Terraform.
*   `/components` & `/pages` : UI React (Frontend).
*   `aws-cdk-stack.ts` : Définition de l'infrastructure via CDK.

## 🏗️ Prérequis Système
*   Node.js v20+
*   AWS CLI configuré (`aws configure`)
*   Compte Google AI Studio (Clé API Gemini)
