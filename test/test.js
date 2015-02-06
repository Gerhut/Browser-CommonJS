describe('Browser-CommonJS', function () {
  beforeEach(function () {
    useCommonJSModule.clearCache()
  })
  it('should load a module', function (done) {
    useCommonJSModule('./module', function (exports) {
      exports.should.be.equal(1)
      done()
    })
  })
  it('should load a module requires another module', function (done) {
    useCommonJSModule('./requireModule', function (exports) {
      exports.should.be.equal(3)
      done()
    })
  })
  it('should deal with cycle dependent', function (done) {
    useCommonJSModule('./cycleModuleA', function (exports) {
      exports.should.be.equal(7)
      done()
    })
  })
  it('should deal with inline module', function () {
    globalFunc().should.be.equal(4)
  })
  it('should deal with inline module with src', function () {
    globalFunc2().should.be.equal(4)
  })
})