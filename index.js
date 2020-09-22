"use strict";

import icalParser from 'ical-parser';
import icalGenerator from 'ical-generator';
import requests from './requests';
import xml2js from 'xml2js';
import needle from 'needle';
import moment from 'moment';

/**
 * Class contructor to create the CalDav connection 
 * and expose methods for interaction
 * 
 * @param {Object} settings required
 ** @param {string} username required
 ** @param {string} password required
 ** @param {string} access_token required in place of @username and @passward
 ** @param {string} server required 
 ** @param {string} basePath required
 ** @param {string} principalPath required
 */
export default class Caldavjs {
  constructor(settings) {
    this.username = settings.username || null;
    this.password = settings.password || null;
    this.access_token = settings.access_token || null;
    this.server = settings.server || null;
    this.basePath = settings.basePath || null;
    this.principalPath = settings.principalPath || null;
    this.timezone = settings.timezone || null;
    this.parserLogging = settings.parserLogging || true;
    this.unifyTags = (str) => {
      if (!str) return str;
      return str.toLowerCase().replace(/^\w+:/, '');
    }
    this.XML2JS_OPTIONS = {
      tagNameProcessors: [this.unifyTags],
    };
    this.sendRequest = this.sendRequest.bind(this);
    this.extractData = this.extractData.bind(this);
    this.listEvents = this.listEvents.bind(this);
    this.createCalendar = this.createCalendar.bind(this);
    this.listCalendars = this.listCalendars.bind(this);
    this.deleteCalendar = this.deleteCalendar.bind(this);
    this.getChanges = this.getChanges.bind(this);
    this.createEvent = this.createEvent.bind(this);
    this.deleteEvent = this.deleteEvent.bind(this);
  };

  async sendRequest(options) {
    let self = this;
    let url = this.server;
    if (this.basePath && options.url.indexOf(this.basePath) < 0) {
      url += this.basePath;
    }
    options.url = url + options.url;
    options.headers = options.headers || {};
    options.headers['Content-Type'] = options.headers['Content-Type'] || 'application/xml; charset=utf-8';
    if (this.access_token) {
      options.headers['Authorization'] = 'Bearer ' + this.access_token;
    } else {
      let auth = this.username + ':' + this.password;
      options.headers['Authorization'] = 'Basic ' + (new Buffer(auth).toString('base64'));
    }
    return needle(options.method, options.url, options.data, {
      parse_response: false,
      headers: options.headers
    }).then(response => {
      const body = response.body;
      if (response.statusCode >= 300) {
        throw new Error(`Status code ${response.statusCode} - ${JSON.stringify(body, undefined, 2)}`);
      }
      return new Promise((resolve, reject) => {
        xml2js.parseString(body, self.XML2JS_OPTIONS, (err, result) => {
          if (err) return reject(err);
          if (!result) return resolve("Success");
          let parsed = (result['multistatus']['response'] || []).map(resp => {
            let obj = {
              href: resp['href'],
            };
            obj.data = resp['propstat'][0]['prop'][0];
            return obj;
          });
          resolve({
            responses: parsed,
            body: result
          });
        });
      });
    }).catch(error => {
      throw new Error(`Error in CalDav fetch: ${error}`);
    });
  }

  extractData(xmlObj, fields) {
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


  /**
   * list events from a given calendar filename 
   * 
   * @param {object} required 
   ** @param {string} filename required
   ** @param {string} start
   ** @param {string} end
   *
   * @return {array} items
   ** @return {boolean} allDay
   ** @return {string} etag
   ** @return {string} calendarData
   ** @return {string} start
   ** @return {string} end
   ** @return {string} summary
   ** @return {string} location
   ** @return {string} description
   ** @return {string} color
   ** @return {csv-string} categories
   */
  listEvents(input) {
    let self = this;
    input.start = moment(input.start).format("YYYYMMDDTHHmmss");
    input.end = moment(input.end).format("YYYYMMDDTHHmmss");
    return this.sendRequest({
        url: input.filename,
        method: 'REPORT',
        headers: {
          Depth: 1
        },
        data: requests.listEvents(input),
      })
      .then(events => {
        return events.responses.map(evt => {
          return self.extractData(evt, [
            ['getetag', 'etag'],
            ['calendar-data', 'calendarData']
          ]);
        })
      })
      .then(events => {
        return Promise.all(events.map(evt => {
          return new Promise((resolve, reject) => {
            icalParser.convert(evt.calendarData, this.parserLogging, (err, parsed) => {
              if (err) return reject(err);
              parsed = parsed.VCALENDAR[0].VEVENT[0];
              evt.allDay = (parsed[`DTSTART;TZID=${self.timezone}`] || parsed[`DTSTART;VALUE=DATE`]).length === 8;
              evt.start = parsed[`DTSTART;TZID=${self.timezone}`] || parsed[`DTSTART;VALUE=DATE`];
              evt.end = parsed[`DTEND;TZID=${self.timezone}`] || parsed[`DTEND;VALUE=DATE`];
              evt.summary = parsed.SUMMARY;
              evt.location = parsed.LOCATION;
              evt.description = parsed.DESCRIPTION;
              evt.color = parsed.COLOR;
              evt.categories = parsed.CATEGORIES;
              evt.json = parsed;
              resolve();
            })
          })
        })).then(_ => events);
      })
  }

  /**
   * Create a new calendar 
   * 
   * @param {object} required 
   ** @param {string} name required
   ** @param {string} timezone override for settings
   ** @param {string} fllename required
   ** @param {string} description 
   *
   * @return {string}
   */
  createCalendar(input) {
    let cal = icalGenerator({
      name: input.name,
      timezone: input.timezone || this.timezone,
    });
    return this.sendRequest({
        url: input.filename,
        method: 'MKCALENDAR',
        data: requests.createCalendar({
          data: cal.toString(),
          name: input.name,
          description: input.description
        }),
      })
      .then(response => {
        return "Success";
      })
  }

  /**
   * List all calendars at the resource url 
   *
   * @return {array} of @return {object} 
   ** @return {string} owner
   ** @return {string} displayName
   ** @return {string} ctag
   ** @return {string} syncToken
   */
  listCalendars(input) {
    let self = this;
    return this.sendRequest({
        method: 'PROPFIND',
        url: self.principalPath || '',
        headers: {
          Depth: 0,
        },
        data: requests.principal(),
      })
      .then(principals => {
        let href = principals.responses[0].data['current-user-principal'][0]['href'][0];
        return this.sendRequest({
          method: 'PROPFIND',
          url: href,
          headers: {
            Depth: 0
          },
          data: requests.calendarHome(),
        })
      })
      .then(calhome => {
        let href = calhome.responses[0].data['calendar-home-set'][0]['href'][0];
        return this.sendRequest({
          method: 'PROPFIND',
          url: href,
          headers: {
            Depth: 1
          },
          data: requests.calendarList(),
        })
      })
      .then(calendars => {
        calendars.responses.shift();
        return calendars.responses.map(cal => {
          let obj = self.extractData(cal, ['owner', ['displayname', 'name'],
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

  /**
   * Delete the calendar of a given filename 
   * 
   * @param {object} required 
   ** @param {string} filename required
   *
   * @return {string} 
   */
  deleteCalendar(input) {
    return this.sendRequest({
      url: input.filename,
      method: 'DELETE',
    })
  }

  /**
   * Get calendar changes since syncToken 
   * 
   * @param {object} required 
   ** @param {string} filename required
   ** @param {string} syncToken required
   *
   * @return {object} 
   ** @return {string} syncToken
   ** @return {object} changes
   *** @return {string} href
   *** @return {string} etag
   */
  getChanges(input) {
    let self = this;
    return this.sendRequest({
        url: input.filename,
        method: 'REPORT',
        data: requests.getChanges({
          syncToken: input.syncToken
        }),
      })
      .then(changes => {
        let syncToken = changes.body['multistatus']['sync-token'][0];
        changes = changes.responses.map(change => {
          return self.extractData(change, [
            ['getetag', 'etag']
          ]);
        });
        return {
          changes,
          syncToken
        };
      })
  }

  /**
   * Create a new event of a given filename 
   * 
   * @param {object} required 
   ** @param {ISODate} start required
   ** @param {ISODate} end required
   ** @param {string} summary required
   ** @param {string} filename required 
   ** @param {string} timezone override for settings
   ** @param {object} organizer 
   *** @param {string} name 
   *** @param {string} email 
   *** @param {string} mailto 
   *** @param {string} type of @param predefined individual, group, resource, room, unknown 
   ** @param {string} location 
   ** @param {string} description 
   ** @param {string} color 
   ** @param {array} categories of @param objects
   *** @param {string} name 
   ** @param {object} attendees  @param objects
   *** @param {string} name 
   *** @param {string} email 
   *** @param {string} mailto 
   ** @param {boolean} allDay 
   *
   * @return {string}
   */
  createEvent(input) {
    let evt = null;
    try {
      evt = icalGenerator({
        events: [{
          start: new Date(input.start),
          end: new Date(input.end),
          summary: input.summary,
          organizer: input.organizer,
          description: input.description,
          location: input.location,
          timezone: input.timezone || this.timezone,
          categories: input.categories,
          attendees: input.attendees,
          allDay: input.allDay || true
        }]
      });
    } catch (e) {
      throw new Error(e.toString());
    }
    let string = evt.toString();
    string = string.replace('\nLOCATION', '\nCOLOR:' + input.color + '\nLOCATION');
    return this.sendRequest({
      url: input.filename,
      method: 'PUT',
      data: string,
      headers: {
        'Content-Type': 'text/calendar'
      },
    })
  }

  /**
   * Delete the calendar of a given filename 
   * 
   * @param {object} required 
   ** @param {string} filename required
   *
   * @return {string} 
   */
  deleteEvent(input) {
    return this.deleteCalendar(input);
  }

}
