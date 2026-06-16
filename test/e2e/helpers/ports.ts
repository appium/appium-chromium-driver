import net from 'node:net';

/** Returns an ephemeral TCP port on the local machine. */
export async function getFreePort(): Promise<number> {
  const server = net.createServer();
  return await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close(() => reject(new Error('Could not resolve a free port')));
        return;
      }
      server.close((err) => (err ? reject(err) : resolve(address.port)));
    });
  });
}
