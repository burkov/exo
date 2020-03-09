import _ from 'lodash';
import pidusage from 'pidusage';

export class JpsEntry {
  pid: number;
  javaClass: string;

  constructor(raw: string) {
    let result = /^(\d+)\s?([^ ]*)/.exec(raw);
    if (!result) throw new Error(`Failed to parse jps entry: '${ raw }'`);
    this.pid = parseInt(result[1].trim());
    if (!_.isInteger(this.pid)) throw new Error(`pid can't be a non-integer value!`);
    this.javaClass = result[2].trim();
  }
}