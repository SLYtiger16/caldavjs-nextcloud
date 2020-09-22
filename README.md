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
    principalPath: "The relative path where principals can be found, e.g. /principals/users",  //YES lead "/"; NO trailing "/",
    timezone: "America/Chicago" //sets the default, can be overridden in methods
    parserLogging: true //toggles verbose logging from the calendar parser
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
  "filename": "/calendars/admin/calendar-name-at-end-of-private-link",
  "start": "20200601T000000Z",
  "end": "20200630T115959Z",
})
```

#### Input
* input `object`
  * filename **required** `string`
  * start `date-time`
  * end `date-time`

#### Output
* output `array`
  * items `object`
    * allDay `boolean`
    * etag `string`
    * calendarData `string`
    * start `string`
    * end `string`
    * summary `string`
    * location `string`
    * description `string`
    * color `string`
    * categories `string` comma separated
    * json `json` all event data which was not parsed

### createCalendar



```js
caldav.createCalendar({
  "name": "",
  "timezone": "", // only to override settings
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
  "allDay": false,
  "start": "ISODateString",
  "end": "ISODateString",
  "summary": "title",
  "filename": "/calendars/admin/calendar-name-at-end-of-private-link/unique-filename-for-this-event",
  "location": "wherever",
  "description": "tell them about it",
  "timezone": "America/Chicago", //only to override settings
  "color": "green",
  "categories": [
    { "name" : "awesome" },
    { "name" : "tags" },
    { "name" : "go" },
    { "name" : "here" }
  ],
  "attendees": [
    {
      "name": "name",
      "email": "test@example.com",
      "mailto": "test@example.com", //to override email
      "type": "one of: individual, group, room, resource, unknown"
    }
  ],
  "organizer": 
    {
      "name": "name",
      "email": "test@example.com",
      "mailto": "test@example.com", //to override email
    }
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
  * categories `array` of `objects`
    * name `string` 
  * attendees `array` of `objects`
    * name `string` 
    * email `string` 
    * mailto `string` 
    * type `string` one of "individual", "group", "room", "resource", "unknown"
  * organizer `object`
    * name `string` 
    * email `string` 
    * mailto `string` 

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

