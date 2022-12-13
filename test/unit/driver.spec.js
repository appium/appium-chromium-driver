import ChromeDriver from '../../lib/driver';

describe('ChromeDriver', function() {
  it('should be exported', function() {
    const c = new ChromeDriver();
    should.exist(c);
  });
});
