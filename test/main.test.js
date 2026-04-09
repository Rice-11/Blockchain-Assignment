const Main = artifacts.require("Main");

contract("Main", () => {
  it("starts with value 0", async () => {
    const main = await Main.new();
    const value = await main.getValue();
    assert.equal(value.toString(), "0", "initial value should be zero");
  });

  it("updates stored value", async () => {
    const main = await Main.new();
    await main.setValue(42);
    const value = await main.getValue();
    assert.equal(value.toString(), "42", "stored value should be updated");
  });
});
