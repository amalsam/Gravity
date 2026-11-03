// Top edge of the simulation stage in viewport coordinates.
// Simulations used to hardcode the 64px navbar; this stays correct when the
// page is scrolled (the article below the stage makes the page scrollable).
export const simTop = () => {
  if (typeof document === "undefined") return 64;
  const stage = document.querySelector("[data-sim-stage]");
  return stage ? stage.getBoundingClientRect().top : 64;
};
