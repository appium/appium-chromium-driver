import ChromeDriver from '../../lib/driver';

describe('ChromeDriver', function() {

  let chai;
  let should;

  before(async function () {
    chai = await import('chai');
    const chaiAsPromised = await import('chai-as-promised');

    should = chai.should();
    chai.use(chaiAsPromised.default);
  });

  it('should be exported', function() {
    const c = new ChromeDriver();
    should.exist(c);
  });
});
