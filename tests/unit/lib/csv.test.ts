import { toCsv } from "@/lib/csv";

describe("toCsv", () => {
  it("joins headers and rows with commas and CRLF line endings", () => {
    expect(toCsv(["Name", "Roll"], [["Ananya Rao", "23s1000123"]])).toBe(
      "Name,Roll\r\nAnanya Rao,23s1000123",
    );
  });

  it("quotes and escapes fields containing commas, quotes, or newlines", () => {
    expect(toCsv(["Title"], [['Say "hi", then leave\nnext line']])).toBe(
      'Title\r\n"Say ""hi"", then leave\nnext line"',
    );
  });

  it("stringifies numeric cells without quoting", () => {
    expect(toCsv(["Count"], [[42]])).toBe("Count\r\n42");
  });

  it("produces just the header row for an empty dataset", () => {
    expect(toCsv(["A", "B"], [])).toBe("A,B");
  });
});
