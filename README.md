# Nexus IQ Azure Devops Extension

A Azure DevOps Extension which wraps the Nexus IQ CLI jar client in NodeJS calls in order to invoke from and report back to Azure DevOps.

## Agent Requirements

IQ for Azure Devops uses [nexus-iq-cli](https://help.sonatype.com/display/NXI/Nexus+IQ+CLI) to run the policy evaluation so the JRE must be installed on the executing build agent.

## Building the Extension

The extension can be built using the [Node CLI for Azure Devops and TFS](https://github.com/Microsoft/tfs-cli).

```
1) npm install - from the iqtask folder

2) tfx extension create  --manifest-globs vss-extension.json --publisher <your Azure Devops publisher name>  - from the root directory of the repository.

The above will create a .vsix packaged version of the extension - small celebration is required here!!
```
## Publishing the extension
You will be required to create a Publisher account on Visual Studio Marketplace.
Drag and drop .vsix file to publish.

NOTE - you will need to share this back to your VSTS instance (via the canonical name. Look at your Azure Devops url as follows
https://<canonical name>.visualstudio.com/_projects

Once back in VSTS Settings>Extensions> Install your wonderful IQ scanning extension that you just shared from yourself.

Go back into the root of the VSTS instance then click on cog -> extensions. Click on the name of the extension and click 'Get it free' and click 'Download'.

Go to Project (e.g. Second Project) and click (...) and edit build definition. Re-add the task

Within the build definition create a secret variable called (default) iq_password. This ensures the password is masked in all logs etc. This will be picked up by the default value of 'iq password'
in the build task. Of course you can override this as required.


## Testing

You can now test the extension as a build step. Simply search 'Nexus IQ for Azure Devops'. Follow the required fields note http: is required in the server field.

[![DepShield Badge](https://depshield.sonatype.org/badges/maurycupitt/nexus-iq-azure-devops-extension/depshield.svg)](https://depshield.github.io)
