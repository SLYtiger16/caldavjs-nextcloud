# CalDavJS-Nextcloud

Client library for CalDAV

## Installation and Usage
```bash
npm install --save caldavjs-nextcloud
```
```js
settings: {
    username: "",
    password: "",
    access_token: "An access token to use in place of username/password (required for Google)",
    server: "https://cloud.example.com:3333",
    basePath: "The absolute path for caldav calls, e.g. /caldav/v2 for Google Calendar",
    principalPath: "The relative path where principals can be found, e.g. 'p'",
  }
let caldav = require('@datafire/caldav').create({
  username: "",
  password: "",
  access_token: "",
  server: "",
  basePath: "",
  principalPath: ""
});

caldav.listCalendars({}).then(data => {
  console.log(data);
});
```

## Description

Access and update calendar data using the CalDAV protocol

## Actions

### listEvents

```js
caldav.listEvents({
  "filename": ""
})
```

#### Input
* input `object`
  * filename **required** `string`

#### Output
* output `array`
  * items `object`
    * etag `string`
    * calendarData `string`
    * start `string`
    * end `string`
    * summary `string`

### createCalendar



```js
caldav.createCalendar({
  "name": "",
  "timezone": "",
  "filename": ""
})
```

#### Input
* input `object`
  * name **required** `string`
  * timezone **required** `string`
  * filename **required** `string`
  * description `string`

#### Output
* output `string`

### listCalendars



```js
caldav.listCalendars({})
```

#### Input
* input `object`

#### Output
* output `array`
  * items `object`
    * owner `string`
    * displayName `string`
    * ctag `string`
    * syncToken `string`

### deleteCalendar



```js
caldav.deleteCalendar({
  "filename": ""
})
```

#### Input
* input `object`
  * filename **required** `string`

#### Output
* output `string`

### getChanges



```js
caldav.getChanges({
  "filename": "",
  "syncToken": ""
})
```

#### Input
* input `object`
  * filename **required** `string`
  * syncToken **required** `string`

#### Output
* output `object`
  * syncToken `string`
  * changes `array`
    * items `object`
      * href `string`
      * etag `string`

### createEvent



```js
caldav.createEvent({
  "start": "",
  "end": "",
  "summary": "",
  "filename": ""
})
```

#### Input
* input `object`
  * start **required** `string`
  * end **required** `string`
  * summary **required** `string`
  * organizer `string`
  * filename **required** `string`

#### Output
* output `string`

### deleteEvent



```js
caldav.deleteEvent({
  "filename": ""
})
```

#### Input
* input `object`
  * filename **required** `string`

#### Output
* output `string`



## Definitions

*This integration has no definitions*
