class MockTable {
  constructor() {
    this.records = [];
    this.nextId = 1;
  }
  async add(record) {
    const id = record.id || this.nextId++;
    const newRecord = { ...record, id };
    this.records.push(newRecord);
    return id;
  }
  async toArray() {
    return [...this.records];
  }
  async get(id) {
    return this.records.find(r => r.id === id) || null;
  }
  async update(id, data) {
    const record = this.records.find(r => r.id === id);
    if (record) {
      Object.assign(record, data);
    }
  }
  async delete(id) {
    this.records = this.records.filter(r => r.id !== id);
  }
  where(field) {
    return {
      equals: (val) => {
        return {
          toArray: async () => {
            return this.records.filter(r => r[field] === val);
          }
        };
      }
    };
  }
  filter(fn) {
    return {
      toArray: async () => {
        return this.records.filter(fn);
      }
    };
  }
}

export default class MockDexie {
  constructor(name) {
    this.name = name;
    this.tables = [];
  }
  version(v) {
    return {
      stores: (schema) => {
        for (const tableName of Object.keys(schema)) {
          if (!this[tableName]) {
            this[tableName] = new MockTable();
            this.tables.push(this[tableName]);
          }
        }
        return this;
      }
    };
  }
  on(event, callback) {}
  async open() {
    return this;
  }
}
