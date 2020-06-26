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
    access_token: "An access token to use in place of username/password (not used unless setup in Nextcloud)",
    server: "https://cloud.example.com:3333 or https://cloud.example.com:3333/nextcloud", //NO trailing "/"
    basePath: "The absolute path for caldav calls, e.g. /remote.php/dav for Nextcloud", //YES lead "/"; NO trailing "/"
    principalPath: "The relative path where principals can be found, e.g. /principals/users",  //YES lead "/"; NO trailing "/"
  }

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
  "filename": "/calendars/admin/calendar-name-at-end-of-private-link" 
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
    * location `string`
    * description `string`
    * color `string`

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
  "filename": "/calendars/admin/calendar-name-at-end-of-private-link" 
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
  "filename": "/calendars/admin/calendar-name-at-end-of-private-link" 
  "syncToken": "http://sabre.io/ns/sync/90" 
})
```

#### Input
* input `object`
  * filename **required** `string`
  * syncToken **required** `string` //obtained from list calendars

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
  "start": "ISODateString",
  "end": "ISODateString",
  "summary": "title",
  "filename": "/calendars/admin/calendar-name-at-end-of-private-link/unique-filename-for-this-event",
  "location": "wherever",
  "description": "tell them about it",
  "timezone": "America/Chicago".
  "color": "green"
})
```

#### Input
* input `object`
  * start **required** `string`
  * end **required** `string`
  * summary **required** `string`
  * organizer `string`
  * filename **required** `string`
  * location `string`
  * description `string`
  * timezone `string`
  * color `string`

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

