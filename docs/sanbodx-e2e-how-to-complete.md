```
##Zeke's feedback:
```

```
Remove any, or not. We're done with the smoke test. This is the full sandbox testing. Remove all the blockers and any pauses. This is full go, no dry run gates. This is the HubSpot integration into CentralReach. 
```

```
CentralReach to HubSpot Integration (Optidge V2, Oct 2026)  
```

```
update the @Verification. is for anything that is not marked as a field or still waiting, an open item, or will be created in production when production testing. It needs to pass on the initial trigger, which is entered in CentralReach as yes. Once that's unchecked, we need to be able to update and change all the map fields. We need full coverage. Ensure that both the trigger and the change detection work and are polled. We need to do it within the HubSpot and Azure rate limits, so you will be using both the HubSpot CLI and the Azure CLI.
```

```
How to finish - updated review my feedbakc
```

```
Run these in order. Stop a later step if an earlier one fails.  
```

1. ~/Desktop/projects/client_projects/Optidge/azure_central_reach/scripts/create-sandbox-hubspot-properties.mjs

```
Spot CLI to also review how to create the properties, and then create the necessary records with the necessary trigger scopes based on the source of truth field mapping doc for what is built. If anything has been marked "property create in prod", then we will create in prod testing. We need to create at least 10, 20, 15 records it needs to be stressed test but not hit rate limits. You can use the test examples here on the format that we're using. We need to ensure that we test all of the properties on each object, so you must go based off the source of truth
66712883229, client 5324526. BT/RBT 64796590207, employee 5324528. BCBA 64797567870, employee 5324527.
CentralReach to HubSpot Integration (Optidge V2, Oct 2026)  
```

```
2. first, we confirm the initial triggers when each of the three objects has been entered into CentralReach and their fields populated. Confirm that worked  
```

```
and then the next batch is to test all of the field changes and how the webhooks and pollers handle that it.   
```

```
come on. Again, we need to do a wide range of testing here  
```

3. do association labels after this is finished
4. and we need to test all of the cases and any stages that are called out in the field map and that we have mapped in the sandbox

```
based on my feedback above, please review the answers for the agents, questions for the agents, and see if you can answer with what I gave you  
```