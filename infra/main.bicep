targetScope = 'resourceGroup'

@minLength(1)
param environmentName string

@description('Azure region for the Static Web App.')
param location string = resourceGroup().location

@description('Optional tags applied to Azure resources.')
param tags object = {}

var sanitizedEnvironmentName = take(toLower(replace(replace(environmentName, '_', '-'), ' ', '-')), 40)
var staticWebAppName = 'oswp-${sanitizedEnvironmentName}'

resource staticWebApp 'Microsoft.Web/staticSites@2023-12-01' = {
  name: staticWebAppName
  location: location
  tags: tags
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    buildProperties: {
      appLocation: '/'
      outputLocation: 'dist'
    }
  }
}

output AZURE_LOCATION string = location
output AZURE_STATIC_WEB_APP_NAME string = staticWebApp.name
output AZURE_STATIC_WEB_APPS_API_TOKEN string = listSecrets(staticWebApp.id, staticWebApp.apiVersion).properties.apiKey
