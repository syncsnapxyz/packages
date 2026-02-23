# @syncsnap/react

Syncsnap client SDK for React — upload UI, QR code, and file-sync components.

## Example

```tsx
import { SyncsnapUploadButton } from '@syncsnap/react';

<SyncsnapUploadButton
  buttonText="Scan to upload"
  onJobCreated={(job) => {
    console.log('Job created :', job);
  }}
  onCompleted={(job, result) => {
    console.log('Job completed', job, result);
  }}
/>;
```

## Docs

**[Documentation →](https://docs.syncsnap.xyz)**
