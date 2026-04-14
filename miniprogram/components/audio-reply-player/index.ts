Component({
  properties: {
    replyText: {
      type: String,
      value: "",
    },
    playbackState: {
      type: String,
      value: "idle",
    },
    playbackStateLabel: {
      type: String,
      value: "等待播报",
    },
  },
  methods: {
    handleReplay() {
      this.triggerEvent("replay");
    },
    handleStop() {
      this.triggerEvent("stop");
    },
  },
});
