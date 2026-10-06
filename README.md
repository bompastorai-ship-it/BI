# Portal de BI • Laboratório Bom Pastor

Portal Next.js para acessar relatórios Power BI e gerenciar usuários.

## Recursos
- Autenticação em servidor com cookie HTTP-only assinado.
- Senhas protegidas por scrypt, sem credenciais embutidas no código.
- Conta inicial administradora por variáveis de ambiente, com troca de senha obrigatória.
- Cadastro, ativação e desativação de usuários; redefinição de senha.
- Armazenamento de usuários em Vercel Blob **privado**, sem Supabase.
- Relatório incorporado do Power BI configurável por ambiente.

## Configuração
1. Crie um projeto Next.js na Vercel conectado ao repositório.
2. Conecte o Vercel Blob privado ao projeto (variável BLOB_READ_WRITE_TOKEN).
3. Configure INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_PASSWORD e SESSION_SECRET (segredo longo e aleatório).
4. Configure POWERBI_EMBED_URL com a URL do atributo src de seu iframe do Power BI, por exemplo https://app.powerbi.com/view?r=...
5. Faça o deploy. Entre com a conta inicial e troque a senha.

Para desenvolvimento local: npm install, crie .env.local com as variáveis e execute npm run dev.

## Atenção à segurança
O link "Publicar na Web" do Power BI é publicamente acessível por qualquer pessoa que tenha a URL, inclusive fora deste portal. Para relatórios confidenciais, implemente Power BI Embedded com autenticação adequada em vez de Publish to Web.

O Vercel Blob não oferece transações no arquivo JSON de usuários; cadastros simultâneos podem disputar a mesma gravação. Para alto volume de contas ou requisitos avançados de segurança, migre para um banco transacional, com auditoria e limitação de tentativas de login.
