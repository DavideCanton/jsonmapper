import { expect } from 'chai';
import { describe } from 'mocha';

import { JsonArray, JsonArrayOfComplexProperty, JsonClass, JsonComplexProperty, JsonProperty, makeCustomDecorator } from '../decorators';
import { SerializeFn } from '../interfaces';
import { JsonMapper } from '../mapper';

const JsonDateProperty = makeCustomDecorator<Date>(
  d => d ? d.getFullYear().toString() : '',
  s => new Date(+s, 2, 12)
);

function dateEquals(d: Date | null | undefined, d2: Date | null | undefined): boolean {
  if (d === d2) return true;

  if (!d || !d2) return false;

  return d.getTime() === d2.getTime();
}

@JsonClass(true)
class Address {
  @JsonProperty()
  line1 = 'line1';

  @JsonProperty()
  line2 = 'line2';

  serialize: SerializeFn;
}

@JsonClass(false)
class AddressExtended extends Address {
  @JsonProperty()
  line3 = 'line3';

  serialize: SerializeFn;

  [other: string]: any;
}

enum Sesso {
  M = 0, F = 1
}

@JsonClass()
class Person {
  @JsonProperty()
  firstName = '';

  @JsonProperty(Person.mapLastName)
  lastName = '';

  @JsonProperty('eta')
  age = -1;

  @JsonDateProperty()
  date: Date | null = null;

  @JsonDateProperty('date22')
  date2: Date | null = null;

  @JsonProperty()
  sex: Sesso = Sesso.M;

  @JsonArray()
  numbers: number[] = [];

  @JsonArray({ keepNullArray: true })
  numbers2: number[] | null = null;

  @JsonComplexProperty(AddressExtended, 'aa')
  address: AddressExtended = new AddressExtended();

  @JsonArrayOfComplexProperty(Address)
  prevAddresses: Address[] = [];

  @JsonArrayOfComplexProperty(Address, undefined, true)
  nextAddresses: Address[] | null = null;

  serialize: SerializeFn;

  static mapLastName(s: string): string {
    return s.toUpperCase();
  }
}


describe('Mapper tests', () => {
  it('should deserialize', () => {
    const obj = {
      firstName: 'Piero',
      lastName: 'Gorgi',
      eta: 16,
      date: '2012',
      date22: '2014',
      sex: 1,
      numbers: [1, 2, 3],
      aa: {
        line1: 'a',
        line2: 'b',
        line3: 'c',
        line4: 'd'
      },
      prevAddresses: [
        {
          line1: 'c',
          line2: 'd',
          line4: 'x'
        },
        {
          line1: 'e',
          line2: 'f'
        },
        null
      ]
    };

    const p = JsonMapper.deserialize(Person, obj);

    expect(p).to.be.not.null;
    expect(p.address).to.be.not.null;

    expect(p instanceof Person).to.be.true;
    expect(p.address instanceof AddressExtended).to.be.true;

    expect(p.address.line4).to.equal('d');

    expect(p.firstName).to.equal(obj.firstName);
    expect(p.lastName).to.equal(obj.lastName.toUpperCase());
    expect(p.age).to.equal(obj.eta);
    expect(p.sex).to.equal(Sesso.F);
    expect(dateEquals(p.date, new Date(+obj.date, 2, 12))).to.be.true;
    expect(dateEquals(p.date2, new Date(+obj.date22, 2, 12))).to.be.true;

    expect(p.numbers.length).to.equal(obj.numbers.length);

    expect(p.numbers[0]).to.equal(obj.numbers[0]);
    expect(p.numbers[1]).to.equal(obj.numbers[1]);
    expect(p.numbers[2]).to.equal(obj.numbers[2]);

    expect(p.address.line1).to.equal(obj.aa.line1);
    expect(p.address.line2).to.equal(obj.aa.line2);
    expect(p.address.line3).to.equal(obj.aa.line3);

    expect(p.prevAddresses.length).to.equal(obj.prevAddresses.length);

    expect(p.prevAddresses[0].line1).to.equal(obj.prevAddresses[0].line1);
    expect(p.prevAddresses[0].line2).to.equal(obj.prevAddresses[0].line2);
    expect((<any>p.prevAddresses[0]).line3).to.be.undefined;

    expect(p.prevAddresses[1].line1).to.equal(obj.prevAddresses[1].line1);
    expect(p.prevAddresses[1].line2).to.equal(obj.prevAddresses[1].line2);

    expect(p.prevAddresses[2]).to.be.null;
  });

  it('should deserialize array', () => {
    const objs = [{
      firstName: 'Piero',
      lastName: 'Gorgi',
      eta: 16,
      date: '2012',
      date22: '2014',
      sex: 1,
      numbers: [1, 2, 3],
      aa: {
        line1: 'a',
        line2: 'b',
        line3: 'c'
      },
      prevAddresses: [
        {
          line1: 'c',
          line2: 'd'
        },
        {
          line1: 'e',
          line2: 'f'
        },
        null
      ]
    }, {
      firstName: 'aaa',
      lastName: 'bbb',
      eta: 21,
      date: '2015',
      date22: '2017',
      sex: 0,
      numbers: [3, 4, 5],
      aa: {
        line1: 'g',
        line2: 'j',
        line3: 'k'
      },
      prevAddresses: [
        {
          line1: 'f',
          line2: 's'
        },
        {
          line1: 'c',
          line2: 'c'
        },
        null
      ]
    }];

    const ps = JsonMapper.deserializeArray(Person, objs);

    expect(ps.length).to.equal(objs.length);

    ps.forEach((p, i) => {
      const obj = objs[i];

      expect(p).to.be.not.null;
      expect(p.address).to.be.not.null;

      expect(p instanceof Person).to.be.true;
      expect(p.address instanceof AddressExtended).to.be.true;

      expect(p.firstName).to.equal(obj.firstName);
      expect(p.lastName).to.equal(obj.lastName.toUpperCase());
      expect(p.age).to.equal(obj.eta);
      expect(p.sex).to.equal(obj.sex);
      expect(dateEquals(p.date, new Date(+obj.date, 2, 12))).to.be.true;
      expect(dateEquals(p.date2, new Date(+obj.date22, 2, 12))).to.be.true;

      expect(p.numbers.length).to.equal(obj.numbers.length);

      expect(p.numbers[0]).to.equal(obj.numbers[0]);
      expect(p.numbers[1]).to.equal(obj.numbers[1]);
      expect(p.numbers[2]).to.equal(obj.numbers[2]);

      expect(p.address.line1).to.equal(obj.aa.line1);
      expect(p.address.line2).to.equal(obj.aa.line2);
      expect(p.address.line3).to.equal(obj.aa.line3);

      expect(p.prevAddresses.length).to.equal(obj.prevAddresses.length);

      expect(p.prevAddresses[0].line1).to.equal(obj.prevAddresses[0].line1);
      expect(p.prevAddresses[0].line2).to.equal(obj.prevAddresses[0].line2);

      expect(p.prevAddresses[1].line1).to.equal(obj.prevAddresses[1].line1);
      expect(p.prevAddresses[1].line2).to.equal(obj.prevAddresses[1].line2);

      expect(p.prevAddresses[2]).to.be.null;
    });
  });

  it('should serialize', () => {
    const obj = {
      firstName: 'Piero',
      lastName: 'Milo',
      eta: 16,
      sex: 1,
      date: '2012',
      numbers: [1, 2, 3],
      aa: {
        line1: 'a',
        line2: 'b',
        line3: 'c'
      },
      prevAddresses: [
        {
          line1: 'c',
          line2: 'd'
        },
        {
          line1: 'e',
          line2: 'f'
        },
        null
      ]
    };

    const p = JsonMapper.deserialize(Person, obj);

    const s = p.serialize();

    const p2 = JsonMapper.deserialize(Person, s);

    expect(p2.firstName).to.equal(p.firstName);
    expect(p2.lastName).to.equal(p.lastName);
    expect(p2.age).to.equal(p.age);
    expect(dateEquals(p2.date, p.date)).to.be.true;
    expect(p2.sex).to.equal(p.sex);
    expect(p2.numbers.length).to.equal(p.numbers.length);
    expect(p2.numbers[0]).to.equal(p.numbers[0]);
    expect(p2.numbers[1]).to.equal(p.numbers[1]);
    expect(p2.numbers[2]).to.equal(p.numbers[2]);
    expect(p2.address.line1).to.equal(p.address.line1);
    expect(p2.address.line2).to.equal(p.address.line2);
    expect(p2.address.line3).to.equal(p.address.line3);
    expect(p2.prevAddresses.length).to.equal(p.prevAddresses.length);
    expect(p2.prevAddresses[0].line1).to.equal(p.prevAddresses[0].line1);
    expect(p2.prevAddresses[0].line2).to.equal(p.prevAddresses[0].line2);
    expect(p2.prevAddresses[1].line1).to.equal(p.prevAddresses[1].line1);
    expect(p2.prevAddresses[1].line2).to.equal(p.prevAddresses[1].line2);
    expect(p2.prevAddresses[2]).to.be.null;
  });

  it('should not map undefined fields in input object', () => {
    const obj = {
      line1: 'ciao'
    };

    const addr = JsonMapper.deserialize(AddressExtended, obj);
    const addrDefault = new AddressExtended();

    expect(addr instanceof AddressExtended).to.be.true;
    expect(addr.line1).to.equal(obj.line1);
    expect(addr.line2).to.equal(addrDefault.line2);
    expect(addr.line3).to.equal(addrDefault.line3);
  });

  it('should deserialize arrays', () => {
    const obj = {
      numbers: [1, 2, 3],
      numbers2: [1, 2, 3],
      prevAddresses: [
        {
          line1: 'c',
          line2: 'd'
        }
      ],
      nextAddresses: [
        {
          line1: 'e',
          line2: 'f'
        }
      ]
    };
    const p = JsonMapper.deserialize(Person, obj);

    expect(p.numbers.length).to.equal(obj.numbers.length);
    expect(p.numbers[0]).to.equal(obj.numbers[0]);
    expect(p.numbers[1]).to.equal(obj.numbers[1]);
    expect(p.numbers[2]).to.equal(obj.numbers[2]);
    expect(p.numbers2.length).to.equal(obj.numbers2.length);
    expect(p.numbers2[0]).to.equal(obj.numbers2[0]);
    expect(p.numbers2[1]).to.equal(obj.numbers2[1]);
    expect(p.numbers2[2]).to.equal(obj.numbers2[2]);

    expect(p.prevAddresses.length).to.equal(obj.prevAddresses.length);
    expect(p.prevAddresses[0].line1).to.equal(obj.prevAddresses[0].line1);
    expect(p.prevAddresses[0].line2).to.equal(obj.prevAddresses[0].line2);

    expect(p.nextAddresses.length).to.equal(obj.nextAddresses.length);
    expect(p.nextAddresses[0].line1).to.equal(obj.nextAddresses[0].line1);
    expect(p.nextAddresses[0].line2).to.equal(obj.nextAddresses[0].line2);
  });

  it('should deserialize arrays correctly when null', () => {
    const obj = {};
    const p = JsonMapper.deserialize(Person, obj);

    expect(p.numbers.length).to.equal(0);
    expect(p.numbers2).to.be.null;

    expect(p.prevAddresses.length).to.equal(0);
    expect(p.nextAddresses).to.be.null;
  });
});
