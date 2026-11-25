/**
 * Credenciais da autenticação mockada de demonstração.
 *
 * Este módulo é exclusivamente server-side: os salts e hashes nunca devem ser
 * importados por componentes client. Os hashes foram gerados com
 * scripts/generate-auth-hashes.mjs (scrypt, salt individual, 64 bytes).
 */
export const MOCK_USERS = Object.freeze({
  atanaelmendes: Object.freeze({
    name: 'Atanael Mendes',
    salt: 'b7b7c0cbc9e42f11befb50c4cc3b46cb',
    hash: '44f01413905dfc49641cf5ebe9de8182c3d56a92be7609c391504818bbd304df080a849bc099305396af057f7c207bc18d84bab91b3b896bc4ff54b4a124879e',
  }),
  alinijumes: Object.freeze({
    name: 'Alini Jumes',
    salt: '412739fdb46a52c7761f8da49eeade65',
    hash: '68294c466f9e6c7fcb9c6872111ff1f760a42a6eb9904b38ece8e3de2aa31e997d34891edcc7174c10884c18f9745218296b4fcbba6ed77a6a8c0e24863c8854',
  }),
  mayarasimoes: Object.freeze({
    name: 'Mayara Simões',
    salt: '629b65a8f75cebc77dab8d3be263f2f2',
    hash: 'fda6e9c57625f01b83accbf7a52bd4cf0f862fd0cc1dcd7b96ed4643c55ee8ebcfbb38c26de3e9b673c553a595b8babd7c44454ce9bb3909b7eb15a24d472387',
  }),
});

export const DUMMY_CREDENTIALS = Object.freeze({
  salt: 'c81d658078407b00fc36be6eea1888b2',
  hash: 'a86973111c95360ad7d937ab007092da5a21335b3d6c42e33d59a13988dab245ad47ca5233c4d88a392c96479aad81cd7a4f4fe70a526b6bee8a870d22f1de4b',
});
