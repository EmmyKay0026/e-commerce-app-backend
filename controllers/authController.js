import { supabase } from "../config/supabase";

const signUpUser = async (_req, res) => {
  const { firstName, lastName, email, password } = _req.body;
  const { data, error } = await supabase.auth.signUp({
    firstName,
    lastName,
    email,
    password,
  });
  if (error) return res.status(400).json({ error: error.message });
  res.json({ data });
};

const signInUser = async (_req, res) => {
  const { email, password } = _req.body;
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) return res.status(401).json({ error: error.message });
  // console.log(data);

  res.json({ session: data.session });
};

export { signUpUser, signInUser };
