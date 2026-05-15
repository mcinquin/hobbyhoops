const [major, minor] = process.versions.node.split(".").map(Number);

if (major < 22 || (major === 22 && minor < 5)) {
  console.error(
    `Node.js ${process.versions.node} est trop ancien pour HobbyHoops (SQLite intégré). Installez Node.js 22.5 ou plus récent.`
  );
  process.exit(1);
}
