Component({
  properties: {
    state: {
      type: String,
      value: "idle",
    },
  },
  data: {
    pressing: false,
  },
  methods: {
    handleTouchStart() {
      this.setData({ pressing: true });
      this.triggerEvent("recordstart");
    },
    handleTouchEnd() {
      this.setData({ pressing: false });
      this.triggerEvent("recordend");
    },
    handleTouchCancel() {
      this.setData({ pressing: false });
      this.triggerEvent("recordcancel");
    },
  },
});
