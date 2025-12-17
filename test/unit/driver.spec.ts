import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {ChromiumDriver} from '../../lib/driver';

use(chaiAsPromised);

describe('ChromeDriver', function() {
  it('should be exported', function() {
    const c = new ChromiumDriver({} as any);
    expect(c).to.exist;
  });
});

