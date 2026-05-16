const [major, minor] = process.versions.node.split(".").map(Number);

if (major !== 24) {
  console.error(
    `Node.js ${process.versions.node} n'est pas supporté pour HobbyHoops. Utilisez Node.js 24.`
  );
  process.exit(1);
}
