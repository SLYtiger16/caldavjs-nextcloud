"use strict";

const icalParser = require('ical-parser');
const icalGenerator = require('ical-generator');
const requests = require('./requests');
const xml2js = require('xml2js');

const caldav = module.exports = {
  settings: {
    username: "",
    password: "",
    access_token: "An access token to use in place of username/password (required for Google)",
    server: "https://cloud.example.com:3333",
    basePath: "The absolute path for caldav calls, e.g. /caldav/v2 for Google Calendar",
    principalPath: "The relative path where principals can be found, e.g. 'p'",
  }
};

caldav.unifyTags = (str) {
  if (!str) return str;
  return str.toLowerCase().replace(/^\w+:/, '');
}

caldav.XML2JS_OPTIONS = {
  tagNameProcessors: [unifyTags],
}

caldav.request = (input) => {
  let req = {
    method: input.method,
    url: input.url,
    qs: input.query,
    body: input.body,
    headers: input.headers,
  };
  return new Promise((resolve, reject) => {
    request(req, (err, resp, body) => {
      if (err) return reject(err);
      resolve({
        statusCode: resp.statusCode,
        headers: resp.headers,
        body: resp.body,
      })
    });
  });
}

caldav.sendRequest = (options) {
  let acct = caldav.settings;
  let url = acct.server;
  if (acct.basePath && options.url.indexOf(acct.basePath) !== 0) {
    url += acct.basePath;
  }
  options.url = url + options.url;
  options.headers = options.headers || {};
  options.headers['Content-Type'] = options.headers['Content-Type'] || 'application/xml; charset=utf-8';
  if (caldav.settings.access_token) {
    options.headers.Authorization = 'Bearer ' + caldav.settings.access_token;
  } else {
    let auth = caldav.settings.username + ':' + caldav.settings.password;
    options.headers.Authorization = 'Basic ' + (new Buffer(auth.toString(), 'binary')).toString('base64');
  }
  return caldav.request(options)
    .then(response => {
      if (response.statusCode >= 300) {
        throw new Error(`Status code ${response.statusCode} - ${response.body}`);
      }
      return response.body;
    })
    .then(body => {
      if (!body) return "Success";
      return new Promise((resolve, reject) => {
        xml2js.parseString(body, caldav.XML2JS_OPTIONS, (err, result) => {
          if (err) return reject(err);
          let parsed = (result['multistatus']['response'] || []).map(resp => {
            let obj = {
              href: resp['href'],
            };
            obj.data = resp['propstat'][0]['prop'][0];
            return obj;
          })
          resolve({
            responses: parsed,
            body: result
          });
        })
      })
    })
}

caldav.extractData = (xmlObj, fields) {
  let dest = {
    href: xmlObj.href[0]
  };
  fields.forEach(field => {
    let from = Array.isArray(field) ? field[0] : field;
    let to = Array.isArray(field) ? field[1] : field.substring(field.indexOf(':') + 1);
    if (xmlObj.data[from]) {
      dest[to] = xmlObj.data[from][0];
      let quoted = (typeof dest[to] === 'string') && dest[to].match(/^"(.*)"$/);
      if (quoted) dest[to] = quoted[1];
    }
  })
  return dest;
}

// inputs: [{
//   title: 'filename',
//   type: 'string'
// }, ],
// outputSchema: {
//   type: 'array',
//   items: {
//     type: 'object',
//     properties: {
//       etag: {
//         type: 'string'
//       },
//       calendarData: {
//         type: 'string'
//       },
//       start: {
//         type: 'string',
//         format: 'date-time'
//       },
//       end: {
//         type: 'string',
//         format: 'date-time'
//       },
//       summary: {
//         type: 'string'
//       },
//     }
//   }
// },
caldav.listEvents = (input) => {
  return sendRequest({
      url: input.filename,
      method: 'REPORT',
      headers: {
        Depth: 1
      },
      body: requests.listEvents(),
    })
    .then(events => {
      return events.responses.map(evt => {
        return caldav.extractData(evt, [
          ['getetag', 'etag'],
          ['calendar-data', 'calendarData']
        ]);
      })
    })
    .then(events => {
      return Promise.all(events.map(evt => {
        return new Promise((resolve, reject) => {
          icalParser.convert(evt.calendarData, (err, parsed) => {
            if (err) return reject(err);
            parsed = parsed.VCALENDAR[0].VEVENT[0];
            evt.start = parsed.DTSTART;
            evt.end = parsed.DTEND;
            evt.summary = parsed.SUMMARY;
            resolve();
          })
        })
      })).then(_ => events);
    })
}

// inputs: [{
//     title: 'name',
//     type: 'string'
//   },
//   {
//     title: 'timezone',
//     type: 'string'
//   },
//   {
//     title: 'filename',
//     type: 'string'
//   },
//   {
//     title: 'description',
//     type: 'string',
//     default: ''
//   },
// ],
// outputSchema: {
//   type: 'string'
// },
caldav.createCalendar = (input) => {
  let cal = icalGenerator({
    name: input.name,
    timezone: input.timezone,
  });
  return sendRequest({
      url: input.filename,
      method: 'MKCALENDAR',
      body: requests.createCalendar({
        data: cal.toString(),
        name: input.name,
        description: input.description
      }),
    })
    .then(response => {
      return "Success";
    })
}

// inputs: [],
// outputSchema: {
//   type: 'array',
//   items: {
//     type: 'object',
//     properties: {
//       owner: {
//         type: 'string'
//       },
//       displayName: {
//         type: 'string'
//       },
//       ctag: {
//         type: 'string'
//       },
//       syncToken: {
//         type: 'string'
//       },
//     }
//   }
// },
caldav.listCalendars = (input) => {
  return sendRequest({
      method: 'PROPFIND',
      url: '/' + (caldav.settings.principalPath || ''),
      headers: {
        Depth: 0,
      },
      body: requests.principal(),
    })
    .then(principals => {
      let href = principals.responses[0].data['current-user-principal'][0]['href'][0];
      return sendRequest({
        method: 'PROPFIND',
        url: href,
        headers: {
          Depth: 0
        },
        body: requests.calendarHome(),
      })
    })
    .then(calhome => {
      let href = calhome.responses[0].data['calendar-home-set'][0]['href'][0];
      return sendRequest({
        method: 'PROPFIND',
        url: href,
        headers: {
          Depth: 1
        },
        body: requests.calendarList(),
      })
    })
    .then(calendars => {
      calendars.responses.shift();
      return calendars.responses.map(cal => {
        let obj = caldav.extractData(cal, ['owner', ['displayname', 'name'],
          ['getctag', 'ctag'],
          ['sync-token', 'syncToken']
        ]);
        if (obj.owner) {
          obj.owner = obj.owner['href'][0];
        }
        return obj;
      });
    })
}

// inputs: [{
//   title: 'filename',
//   type: 'string'
// }, ],
// outputSchema: {
//   type: 'string'
// },
caldav.deleteCalendar = (input) => {
  return sendRequest({
    url: input.filename,
    method: 'DELETE',
  })
}

// inputs: [{
//     title: 'filename',
//     type: 'string'
//   },
//   {
//     title: 'syncToken',
//     type: 'string'
//   },
// ],
// outputSchema: {
//   type: 'object',
//   properties: {
//     syncToken: {
//       type: 'string'
//     },
//     changes: {
//       type: 'array',
//       items: {
//         type: 'object',
//         properties: {
//           href: {
//             type: 'string'
//           },
//           etag: {
//             type: 'string'
//           },
//         }
//       },
//     }
//   }
// },
caldav.getChanges = (input) => {
  return sendRequest({
      url: input.filename,
      method: 'REPORT',
      body: requests.getChanges({
        syncToken: input.syncToken
      }),
    })
    .then(changes => {
      let syncToken = changes.body['multistatus']['sync-token'][0];
      changes = changes.responses.map(change => {
        return caldav.extractData(change, [
          ['getetag', 'etag']
        ]);
      });
      return {
        changes,
        syncToken
      };
    })
}

// inputs: [{
//     title: 'start',
//     type: 'string',
//     format: 'date-time'
//   },
//   {
//     title: 'end',
//     type: 'string',
//     format: 'date-time'
//   },
//   {
//     title: 'summary',
//     type: 'string'
//   },
//   {
//     title: 'organizer',
//     type: 'string',
//     default: ''
//   },
//   {
//     title: 'filename',
//     type: 'string'
//   },
// ],
// outputSchema: {
//   type: 'string'
// },
caldav.createEvent = (input) => {
  let evt = null;
  try {
    evt = icalGenerator({
      events: [{
        start: new Date(input.start),
        end: new Date(input.end),
        summary: input.summary,
        organizer: input.organizer,
      }]
    });
  } catch (e) {
    throw new Error(e.toString());
  }
  return sendRequest({
    url: input.filename,
    method: 'PUT',
    body: evt.toString(),
    headers: {
      'Content-Type': 'text/calendar'
    },
  })
}

// inputs: [{
//   title: 'filename',
//   type: 'string',
// }],
// outputSchema: {
//   type: 'string'
// },
// caldav.deleteEvent = (input) => {
//   return caldav.actions.deleteCalendar(input);
// }